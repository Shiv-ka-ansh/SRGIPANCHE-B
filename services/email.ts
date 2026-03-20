import nodemailer from 'nodemailer';

const createTransporter = () => {
  const port = Number(process.env.EMAIL_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
    family: 4,
  } as any);
};

export const sendRegistrationToken = async (
  email: string,
  name: string,
  rollNo: string,
  course: string,
  branch: string,
  section: string,
  year: string,
  token: string
) => {
  const transporter = createTransporter();
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'PANACHE 2K26 <panache2k26@gmail.com>',
      to: email,
      subject: '🎉 PANACHE 2K26 — Registration Confirmed!',
      html: `
        <h2>Hi ${name},</h2>
        <p>You're officially registered for PANACHE 2K26!</p>
        
        <div style="background-color: #121212; color: #CCFF00; padding: 20px; border: 2px solid #CCFF00; box-shadow: 4px 4px 0px #CCFF00; margin: 20px 0; display: inline-block;">
          <h3 style="margin: 0; color: #fff;">YOUR TOKEN:</h3>
          <h1 style="font-size: 40px; margin: 10px 0; letter-spacing: 5px;">${token}</h1>
          <p style="margin: 0; font-size: 14px; color: #ccc;">Keep this safe — you'll need it at the venue</p>
        </div>

        <p><strong>Details:</strong><br/>
        • Roll No: ${rollNo}<br/>
        • Course: ${course} | Branch: ${branch}<br/>
        • Section: ${section} | Year: ${year}</p>
        
        <p>Present this token to the admin desk at the event to register for individual competitions.</p>
        <p>See you at PANACHE 2K26! 🚀</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendEventConfirmation = async (
  email: string,
  name: string,
  events: any[],
  totalAmount: number
) => {
  const transporter = createTransporter();

  // Group events by category
  const categories: Record<string, any[]> = {};
  events.forEach((ev) => {
    if (!categories[ev.category]) {
      categories[ev.category] = [];
    }
    categories[ev.category].push(ev);
  });

  let eventsHtml = '';
  for (const [cat, evs] of Object.entries(categories)) {
    eventsHtml += `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #FF00FF; margin-bottom: 5px; text-transform: uppercase;">[Category: ${cat}]</h3>
        <ul style="list-style-type: none; padding-left: 0; margin-top: 5px;">
    `;
    evs.forEach((ev) => {
      const sub = ev.subEvent ? ` (${ev.subEvent})` : '';
      eventsHtml += `<li>✓ ${ev.eventName}${sub} <span style="float: right;">₹${ev.amount}</span></li>`;
    });
    eventsHtml += `</ul></div>`;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'PANACHE 2K26 <panache2k26@gmail.com>',
    to: email,
    subject: '🏆 PANACHE 2K26 — Your Event Registrations',
    html: `
      <h2>Hi ${name},</h2>
      <p>Here are the events you've been registered for:</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; margin: 20px 0;">
        ${eventsHtml}
        <hr style="border: 1px solid #ccc; margin: 20px 0;"/>
        <h2 style="margin: 0;">TOTAL AMOUNT: ₹${totalAmount}</h2>
      </div>

      <p>Please keep this email as your registration receipt.</p>
      <p>Best of luck! 🎯</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};
