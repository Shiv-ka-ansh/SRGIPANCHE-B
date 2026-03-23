import { google } from "googleapis";

const getGmailService = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground",
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

const encodeEmail = (
  to: string,
  from: string,
  subject: string,
  html: string,
  text: string,
): string => {
  const boundary = "boundary_panache2k26";
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const sendRegistrationToken = async (
  email: string,
  name: string,
  rollNo: string,
  course: string,
  branch: string,
  section: string,
  year: string,
  token: string,
) => {
  try {
    const gmail = await getGmailService();

    const html = `
      <h2>Hi ${name},</h2>
      <p>You are officially registered for PANACHE 2K26!</p>
      <div style="background-color:#121212;color:#CCFF00;padding:20px;border:2px solid #CCFF00;margin:20px 0;display:inline-block;">
        <h3 style="margin:0;color:#fff;">YOUR TOKEN:</h3>
        <h1 style="font-size:40px;margin:10px 0;letter-spacing:5px;">${token}</h1>
        <p style="margin:0;font-size:14px;color:#ccc;">Keep this safe - you will need it at the venue</p>
      </div>
      <p><strong>Details:</strong><br/>
      Roll No: ${rollNo}<br/>
      Course: ${course} | Branch: ${branch}<br/>
      Section: ${section} | Year: ${year}</p>
      <p>Present this token to the admin desk at the event.</p>
      <p>See you at PANACHE 2K26!</p>
    `;

    const text = `Hi ${name}, Your token is: ${token}. Roll No: ${rollNo}, Course: ${course}, Branch: ${branch}, Section: ${section}, Year: ${year}.`;

    const raw = encodeEmail(
      email,
      `"🎉PANACHE 2K26" <${process.env.GMAIL_USER}>`,
      "🎉PANACHE 2K26 - Registration Confirmed",
      html,
      text,
    );

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`--- SUCCESS: Email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(
      `--- ERROR: Failed to send registration email to ${email}:`,
      error,
    );
    return false;
  }
};

export const sendEventConfirmation = async (
  email: string,
  name: string,
  events: any[],
  totalAmount: number,
) => {
  const categories: Record<string, any[]> = {};
  events.forEach((ev) => {
    if (!categories[ev.category]) categories[ev.category] = [];
    categories[ev.category].push(ev);
  });

  let eventsHtml = "";
  let eventsText = "";

  for (const [cat, evs] of Object.entries(categories)) {
    eventsHtml += `<div style="margin-bottom:15px;">
      <h3 style="color:#333;text-transform:uppercase;">Category: ${cat}</h3>
      <ul style="list-style-type:none;padding-left:0;">`;
    eventsText += `\nCategory: ${cat}\n`;
    evs.forEach((ev) => {
      const sub = ev.subEvent ? ` (${ev.subEvent})` : "";
      eventsHtml += `<li>${ev.eventName}${sub} - Rs.${ev.amount}</li>`;
      eventsText += `- ${ev.eventName}${sub} Rs.${ev.amount}\n`;
    });
    eventsHtml += `</ul></div>`;
  }

  try {
    const gmail = await getGmailService();

    const html = `
      <h2>Hi ${name},</h2>
      <p>Here are the events you have been registered for:</p>
      <div style="background-color:#f9f9f9;padding:20px;border:1px solid #ddd;margin:20px 0;">
        ${eventsHtml}
        <hr style="border:1px solid #ccc;margin:20px 0;"/>
        <h2 style="margin:0;">Total Amount: Rs.${totalAmount}</h2>
      </div>
      <p>Please keep this email as your registration receipt.</p>
      <p>Best of luck!</p>
    `;

    const text = `Hi ${name},\n\nRegistered events:\n${eventsText}\nTotal: Rs.${totalAmount}\n\nBest of luck!`;

    const raw = encodeEmail(
      email,
      `"PANACHE 2K26" <${process.env.GMAIL_USER}>`,
      "PANACHE 2K26 - Your Event Registrations",
      html,
      text,
    );

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`--- SUCCESS: Event confirmation sent to ${email}`);
    return true;
  } catch (error) {
    console.error(
      `--- ERROR: Failed to send event confirmation to ${email}:`,
      error,
    );
    return false;
  }
};
