import { Router } from "express";
import bcrypt from "bcrypt";
import { createUser, getUserByEmail, getUserById, updateUser, createPasswordResetToken, consumePasswordResetToken } from "../data/store";
import { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";
import { ValidationError, UnauthorizedError } from "../errors/AppError";
import { signToken } from "../lib/jwt";
import { User } from "@shared/types";
import { sendPasswordResetEmail } from "../lib/email";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { findOrCreateGoogleUser } from "../data/store";

function toSafeUser(user: User) {
  const { password, ...safeUser } = user;
  return safeUser;
}

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const oauthStateCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  maxAge: 10 * 60 * 1000, // 10 minutes
};

const router = Router();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success)
      throw new ValidationError(result.error.issues[0]?.message ?? "Invalid data", result.error.issues);

    const existing = await getUserByEmail(result.data.email);
    if (existing) throw new ValidationError("Email is already registered");

    const user = await createUser(result.data);
    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.cookie("token", token, cookieOptions);
    res.status(201).json(toSafeUser(user));
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success)
      throw new ValidationError("Invalid login data", result.error.issues);

    const user = await getUserByEmail(result.data.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    if (user.provider !== "local") {
      throw new UnauthorizedError("This account uses Google sign-in. Please continue with Google instead.");
    }

    const valid = await bcrypt.compare(result.data.password, user.password!);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.cookie("token", token, cookieOptions);
    res.json(toSafeUser(user));
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(204).send();
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.userId!);
    if (!user) throw new UnauthorizedError("Session user no longer exists");
    res.json(toSafeUser(user));
  })
);

router.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success)
      throw new ValidationError(result.error.issues[0]?.message ?? "Invalid data", result.error.issues);

    const user = await getUserById(req.userId!);
    if (!user) throw new UnauthorizedError("Session user no longer exists");

    const valid = await bcrypt.compare(result.data.currentPassword, user.password!);
    if (!valid) throw new ValidationError("Current password is incorrect");

    await updateUser(user.id, { password: result.data.newPassword });
    res.status(204).send();
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError("Invalid request", result.error.issues);

    const user = await getUserByEmail(result.data.email);
    if (user) {
      const rawToken = await createPasswordResetToken(user.id);
      const resetUrl = `${clientOrigin}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });
    }

    // Same response either way — never reveal whether the email is registered.
    res.json({ message: "If that email is registered, a reset link has been sent." });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Invalid data", result.error.issues);

    const userId = await consumePasswordResetToken(result.data.token);
    if (!userId) throw new ValidationError("This reset link is invalid or has expired");

    await updateUser(userId, { password: result.data.newPassword });
    res.status(204).send();
  })
);

// Start Google OAuth
router.get(
  "/google",
  asyncHandler(async (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie("oauth_state", state, oauthStateCookieOptions);

    const authUrl = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      state,
    });

    res.redirect(authUrl);
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    const savedState = req.cookies?.oauth_state;

    if (
      typeof code !== "string" ||
      typeof state !== "string" ||
      !savedState ||
      state !== savedState
    ) {
      return res.redirect(`${clientOrigin}/login?error=oauth_failed`);
    }

    res.clearCookie("oauth_state", oauthStateCookieOptions);

    try {
      const { tokens } = await googleClient.getToken(code);

      if (!tokens.id_token) {
        return res.redirect(`${clientOrigin}/login?error=oauth_failed`);
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.email) {
        return res.redirect(`${clientOrigin}/login?error=oauth_failed`);
      }

      const user = await findOrCreateGoogleUser({
        email: payload.email,
        name: payload.name || payload.email,
      });

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      res.cookie("token", token, cookieOptions);

      return res.redirect(`${clientOrigin}/dashboard`);
    } catch (err) {
      console.error("Google OAuth failed:", err);
      return res.redirect(`${clientOrigin}/login?error=oauth_failed`);
    }
  })
);


export default router;