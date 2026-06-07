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
  <title>FashionZone</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f4f4; color: #333; }
    .email-container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%); padding: 36px 40px; text-align: center; }
    .header h1 { color: white; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 6px; letter-spacing: 1px; }
    .body { padding: 40px; }
    .footer { background: #fce4ec; padding: 24px 40px; text-align: center; border-top: 1px solid #f48fb1; }
    .footer p { color: #ad1457; font-size: 12px; line-height: 1.6; }
    .footer a { color: #e91e63; text-decoration: none; font-weight: 600; }
    h2 { font-size: 22px; color: #1a1a1a; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.7; color: #555; margin-bottom: 16px; }
    .highlight { color: #e91e63; font-weight: 700; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>FashionZone</h1>
      <p>Style that speaks, fashion that inspires</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>
        You received this email because you have an account with FashionZone.<br/>
        If you have questions, <a href="mailto:support@fashionzone.com">contact our support team</a>.<br/>
        &copy; ${new Date().getFullYear()} FashionZone. All rights reserved.
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
    <h2>Welcome to FashionZone, <span class="highlight">${name}</span>!</h2>
    <p>Thank you for creating an account with us. We're thrilled to have you as part of our fashion community.</p>
    <p>To complete your registration and verify your email address, please use the OTP below:</p>

    <div style="text-align:center; margin: 32px 0;">
      <div style="
        display: inline-block;
        background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
        color: white;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 10px;
        padding: 20px 40px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(233, 30, 99, 0.35);
      ">
        ${otp}
      </div>
    </div>

    <p style="text-align:center; color:#888; font-size:13px;">This OTP is valid for <strong>24 hours</strong>. Do not share it with anyone.</p>

    <div style="background:#fce4ec; border-left: 4px solid #e91e63; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
      <p style="color:#880e4f; font-size:13px; margin:0;">
        <strong>Security Tip:</strong> FashionZone will never ask for your OTP via phone or email. If you didn't request this, please ignore this email or contact our support team immediately.
      </p>
    </div>

    <p style="margin-top: 28px;">Looking forward to helping you discover the latest fashion trends!</p>
    <p>Warmly,<br/><strong>The FashionZone Team</strong></p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'FashionZone <noreply@fashionzone.com>',
    to: email,
    subject: `${otp} is your FashionZone verification code`,
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
      <td style="padding: 12px; border-bottom: 1px solid #fce4ec; vertical-align: middle;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${item.image}" alt="${item.name}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid #f48fb1;" />
          <div>
            <div style="font-weight:600; font-size:14px; color:#1a1a1a;">${item.name}</div>
            <div style="font-size:12px; color:#888; margin-top:4px;">Size: ${item.size} &bull; Color: ${item.color}</div>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #fce4ec; text-align:center; color:#555; font-size:14px;">x${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #fce4ec; text-align:right; font-weight:600; color:#e91e63; font-size:14px;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    <h2>Order Confirmed! <span class="highlight">&#10003;</span></h2>
    <p>Hi <strong>${name}</strong>, thank you for shopping with FashionZone! Your order has been placed successfully and is being processed.</p>

    <div style="background: linear-gradient(135deg, #fce4ec, #f8bbd9); border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <p style="font-size:12px; color:#ad1457; margin:0; text-transform:uppercase; letter-spacing:1px;">Order Number</p>
          <p style="font-size:20px; font-weight:800; color:#880e4f; margin:4px 0 0;">${orderNumber}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:12px; color:#ad1457; margin:0; text-transform:uppercase; letter-spacing:1px;">Payment Method</p>
          <p style="font-size:16px; font-weight:700; color:#880e4f; margin:4px 0 0;">Cash on Delivery</p>
        </div>
      </div>
    </div>

    <h3 style="font-size:16px; color:#1a1a1a; margin-bottom:16px;">Order Summary</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      <thead>
        <tr style="background:#fce4ec;">
          <th style="padding:10px 12px; text-align:left; font-size:12px; color:#ad1457; text-transform:uppercase; letter-spacing:0.5px;">Item</th>
          <th style="padding:10px 12px; text-align:center; font-size:12px; color:#ad1457; text-transform:uppercase; letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 12px; text-align:right; font-size:12px; color:#ad1457; text-transform:uppercase; letter-spacing:0.5px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div style="background:#fce4ec; border-radius:8px; padding:16px 20px; text-align:right; margin-bottom:28px;">
      <span style="font-size:15px; color:#555;">Total Amount: </span>
      <span style="font-size:22px; font-weight:800; color:#e91e63;">₹${total.toLocaleString('en-IN')}</span>
    </div>

    <div style="background:#f5f5f5; border-radius:8px; padding:16px 20px; margin-bottom:24px;">
      <p style="font-size:13px; color:#666; margin:0; line-height:1.7;">
        <strong style="color:#1a1a1a;">What's next?</strong><br/>
        Our team will review your order and send you a shipping confirmation once your items are dispatched. You can track your order from your account dashboard.
      </p>
    </div>

    <p>Happy Shopping! &#128148;<br/><strong>The FashionZone Team</strong></p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'FashionZone <noreply@fashionzone.com>',
    to: email,
    subject: `Order Confirmed - ${orderNumber} | FashionZone`,
    html: emailWrapper(content),
  };

  await transporter.sendMail(mailOptions);
};
