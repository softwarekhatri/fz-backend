import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const emailWrapper = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Poshak Kart</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FFF8ED; color: #333; }
    .email-container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #7B1020 0%, #5A0A15 100%); padding: 36px 40px; text-align: center; }
    .header-logo { font-size: 30px; font-weight: 800; color: #E8A820; letter-spacing: 2px; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 6px; letter-spacing: 1.5px; font-style: italic; }
    .header-bar { height: 3px; background: linear-gradient(90deg, #C8880A, #E8A820, #C8880A); margin-top: 16px; border-radius: 2px; }
    .body { padding: 40px; }
    .footer { background: #FFF4D0; padding: 24px 40px; text-align: center; border-top: 2px solid #E8A820; }
    .footer p { color: #7B1020; font-size: 12px; line-height: 1.8; }
    .footer a { color: #C8880A; text-decoration: none; font-weight: 600; }
    .footer-brand { font-size: 13px; font-weight: 700; color: #5A0A15; margin-bottom: 6px; }
    h2 { font-size: 22px; color: #3D0A10; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.7; color: #555; margin-bottom: 16px; }
    .highlight { color: #C8880A; font-weight: 700; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="header-logo">Poshak Kart</div>
      <div class="header-tagline">Apni Pehchaan, Apna Andaaz</div>
      <div class="header-bar"></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p class="footer-brand">Poshak Kart &mdash; A Brand of JAI MAA SHARDA ENTERPRISES</p>
      <p>
        You received this email because you have an account with Poshak Kart.<br/>
        If you have questions, <a href="mailto:support@poshakkart.in">contact our support team</a>.<br/>
        Near ICICI Building, East Ram Krishna Nagar, Bypass Road, Patna, Bihar &ndash; 800027<br/>
        &copy; ${new Date().getFullYear()} Poshak Kart. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const transporter = createTransporter();

  const content = `
    <h2>Welcome to Poshak Kart, <span class="highlight">${name}</span>!</h2>
    <p>Thank you for creating an account with us. We're thrilled to have you as part of the Poshak Kart family.</p>
    <p>To complete your registration and verify your email address, please use the OTP below:</p>

    <div style="text-align:center; margin: 32px 0;">
      <div style="
        display: inline-block;
        background: linear-gradient(135deg, #7B1020 0%, #5A0A15 100%);
        color: #E8A820;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 10px;
        padding: 20px 40px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(123, 16, 32, 0.35);
        border: 2px solid #C8880A;
      ">
        ${otp}
      </div>
    </div>

    <p style="text-align:center; color:#888; font-size:13px;">This OTP is valid for <strong>24 hours</strong>. Do not share it with anyone.</p>

    <div style="background:#FFF4D0; border-left: 4px solid #C8880A; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
      <p style="color:#5A0A15; font-size:13px; margin:0;">
        <strong>Security Tip:</strong> Poshak Kart will never ask for your OTP via phone or email. If you didn't request this, please ignore this email or contact our support team immediately at <a href="mailto:support@poshakkart.in" style="color:#C8880A;">support@poshakkart.in</a>.
      </p>
    </div>

    <p style="margin-top: 28px;">Looking forward to helping you discover the finest fashion, crafted for your identity!</p>
    <p>Warmly,<br/><strong>The Poshak Kart Team</strong></p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Poshak Kart <support@poshakkart.in>',
    to: email,
    subject: `${otp} is your Poshak Kart verification code`,
    html: emailWrapper(content),
  };

  await transporter.sendMail(mailOptions);
};

export const sendOrderConfirmationEmail = async (
  email: string,
  name: string,
  orderNumber: string,
  items: Array<{ name: string; image: string; size: string; color: string; quantity: number; price: number }>,
  total: number
): Promise<void> => {
  const transporter = createTransporter();

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #FFE090; vertical-align: middle;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${item.image}" alt="${item.name}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid #E8A820;" />
          <div>
            <div style="font-weight:600; font-size:14px; color:#3D0A10;">${item.name}</div>
            <div style="font-size:12px; color:#888; margin-top:4px;">Size: ${item.size} &bull; Color: ${item.color}</div>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #FFE090; text-align:center; color:#555; font-size:14px;">x${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #FFE090; text-align:right; font-weight:600; color:#C8880A; font-size:14px;">&#8377;${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    <h2>Order Confirmed! <span class="highlight">&#10003;</span></h2>
    <p>Hi <strong>${name}</strong>, thank you for shopping with Poshak Kart! Your order has been placed successfully and is being processed.</p>

    <div style="background: linear-gradient(135deg, #FFF4D0, #FFE090); border-radius: 12px; padding: 20px 24px; margin: 24px 0; border: 1px solid #C8880A;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <p style="font-size:12px; color:#7B1020; margin:0; text-transform:uppercase; letter-spacing:1px;">Order Number</p>
          <p style="font-size:20px; font-weight:800; color:#5A0A15; margin:4px 0 0;">${orderNumber}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:12px; color:#7B1020; margin:0; text-transform:uppercase; letter-spacing:1px;">Payment Method</p>
          <p style="font-size:16px; font-weight:700; color:#5A0A15; margin:4px 0 0;">Cash on Delivery</p>
        </div>
      </div>
    </div>

    <h3 style="font-size:16px; color:#3D0A10; margin-bottom:16px;">Order Summary</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      <thead>
        <tr style="background:#FFF4D0;">
          <th style="padding:10px 12px; text-align:left; font-size:12px; color:#7B1020; text-transform:uppercase; letter-spacing:0.5px;">Item</th>
          <th style="padding:10px 12px; text-align:center; font-size:12px; color:#7B1020; text-transform:uppercase; letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 12px; text-align:right; font-size:12px; color:#7B1020; text-transform:uppercase; letter-spacing:0.5px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div style="background: linear-gradient(135deg, #FFF4D0, #FFE090); border-radius:8px; padding:16px 20px; text-align:right; margin-bottom:28px; border:1px solid #C8880A;">
      <span style="font-size:15px; color:#555;">Total Amount: </span>
      <span style="font-size:22px; font-weight:800; color:#7B1020;">&#8377;${total.toLocaleString('en-IN')}</span>
    </div>

    <div style="background:#f5f5f5; border-radius:8px; padding:16px 20px; margin-bottom:24px; border-left: 4px solid #C8880A;">
      <p style="font-size:13px; color:#666; margin:0; line-height:1.7;">
        <strong style="color:#3D0A10;">What's next?</strong><br/>
        Our team will review your order and send you a shipping confirmation once your items are dispatched. Estimated delivery: 2–7 business days depending on your location.
      </p>
    </div>

    <p>Happy Shopping!<br/><strong>The Poshak Kart Team</strong><br/><span style="font-size:12px; color:#C8880A; font-style:italic;">Apni Pehchaan, Apna Andaaz</span></p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Poshak Kart <support@poshakkart.in>',
    to: email,
    subject: `Order Confirmed - ${orderNumber} | Poshak Kart`,
    html: emailWrapper(content),
  };

  await transporter.sendMail(mailOptions);
};
