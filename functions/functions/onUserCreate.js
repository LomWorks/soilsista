const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

/**
 * FUNCTION 1: onUserCreate
 *
 * Trigger: When a new user signs up via Firebase Auth
 * Purpose:
 *   1. Initialize user document in Firestore with defaults
 *   2. Create in-app welcome notification
 *   3. Send welcome email via Gmail (Nodemailer)
 *
 * Required Firebase config (run once in functions/ folder):
 *   firebase functions:config:set gmail.user="info@soilsista.org" gmail.pass="your-app-password"
 */

const getTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail?.user,
    pass: functions.config().gmail?.pass
  }
});

module.exports = functions.auth.user().onCreate(async (user) => {
  console.log(`New user created: ${user.uid}`);

  // Skip admin account
  const adminEmail = functions.config().gmail?.user;
  if (adminEmail && user.email === adminEmail) {
    console.log(`Skipping farmer document creation for admin: ${user.email}`);
    return null;
  }

  try {
    // 1. Create Firestore user document
    await admin.firestore().collection('users').doc(user.uid).set({
      userId: user.uid,
      email: user.email || null,
      phone: user.phoneNumber || null,
      role: 'farmer',
      planType: null,
      accountStatus: 'pending',
      name: null,
      location: null,
      farmSize: null,
      terrain: null,
      waterSources: [],
      farmingType: null,
      currentCrops: [],
      cropHistory: [],
      pestControl: [],
      recentIssues: [],
      consultationStatus: null,
      currentIssue: null,
      consultationHistory: [],
      stats: {
        cropsPlanted: 0,
        cropsHarvested: 0,
        joinedDate: admin.firestore.FieldValue.serverTimestamp(),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingComplete: false,
      emailVerified: user.emailVerified || false
    });

    console.log(`User document initialized for ${user.uid}`);

    // 2. Create in-app welcome notification
    await admin.firestore().collection('activities').add({
      userId: user.uid,
      type: 'notification',
      category: 'system',
      title: 'Welcome to Soil Sista! 🌱',
      message: 'Complete your profile to get started with personalized farming tools and weather alerts.',
      icon: '👋',
      status: 'unread',
      actionUrl: '/get-started',
      actionLabel: 'Complete Profile',
      data: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log(`Welcome notification created for ${user.uid}`);

    // 3. Send welcome email
    if (user.email) {
      try {
        const transporter = getTransporter();
        const year = new Date().getFullYear();

        await transporter.sendMail({
          from: `"Soil Sista" <${functions.config().gmail.user}>`,
          to: user.email,
          subject: 'Welcome to Soil Sista 🌱',
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr>
        <td style="background:#2d5a27;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#f5f0e8;font-size:28px;letter-spacing:1px;">🌱 Soil Sista</h1>
          <p style="margin:8px 0 0;color:#a8d5a2;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Caribbean Farming, Rooted in Knowledge</p>
        </td>
      </tr>

      <tr>
        <td style="background:#ffffff;padding:40px;">
          <h2 style="color:#2d5a27;margin:0 0 16px;font-size:22px;">Welcome to the family 🌿</h2>
          <p style="color:#444;line-height:1.7;margin:0 0 20px;">
            You've just joined a platform built specifically for Caribbean farmers — with tools, weather insights, and expert guidance shaped around the soils and seasons of the islands.
          </p>
          <p style="color:#444;line-height:1.7;margin:0 0 28px;">Here's what you have access to right now:</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:12px 16px;background:#f0f9f4;border-radius:8px;border-left:4px solid #2d5a27;">
                <strong style="color:#2d5a27;">🗓️ Crop Planner</strong><br/>
                <span style="color:#666;font-size:14px;">Build planting schedules based on real Caribbean crop data — timing, yield projections, and succession planting.</span>
              </td>
            </tr>
            <tr><td style="height:10px;"></td></tr>
            <tr>
              <td style="padding:12px 16px;background:#f0f9f4;border-radius:8px;border-left:4px solid #2d5a27;">
                <strong style="color:#2d5a27;">🌤️ Weather Alerts</strong><br/>
                <span style="color:#666;font-size:14px;">Daily alerts calibrated to your specific crops — advice matched to what you're actually growing.</span>
              </td>
            </tr>
            <tr><td style="height:10px;"></td></tr>
            <tr>
              <td style="padding:12px 16px;background:#f0f9f4;border-radius:8px;border-left:4px solid #2d5a27;">
                <strong style="color:#2d5a27;">💬 Expert Consultations</strong><br/>
                <span style="color:#666;font-size:14px;">Premium members get direct WhatsApp access to Caribbean agricultural experts — real answers, not generic advice.</span>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="https://soilsista.org/get-started"
                 style="display:inline-block;background:#2d5a27;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:bold;letter-spacing:0.5px;">
                Complete Your Profile →
              </a>
            </td></tr>
          </table>

          <p style="color:#444;line-height:1.7;margin:0 0 8px;">
            It only takes a few minutes to set up your farm profile — once you do, weather alerts, crop reminders, and personalized tools all kick in automatically.
          </p>
          <p style="color:#444;line-height:1.7;margin:0;">
            Questions? Reply to this email or find us on Instagram <a href="https://instagram.com/soilsista.bs" style="color:#2d5a27;">@soilsista.bs</a>.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#f0f0e8;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#888;font-size:13px;">© ${year} Soil Sista · Antigua &amp; Barbuda / The Bahamas</p>
          <p style="margin:8px 0 0;color:#aaa;font-size:12px;">You're receiving this because you created a Soil Sista account.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
        });

        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        // Don't fail the whole function if email fails
        console.error(`Failed to send welcome email to ${user.email}:`, emailError);
      }
    } else {
      console.log(`No email for user ${user.uid} — skipping welcome email`);
    }

    return null;
  } catch (error) {
    console.error('Error in onUserCreate:', error);
    return null;
  }
});