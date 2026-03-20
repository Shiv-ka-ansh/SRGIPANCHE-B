import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

const FROM_EMAIL = "srgipanache2k26@gmail.com";
const FROM_NAME = "PANACHE 2K26";

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
  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: "PANACHE 2K26 - Registration Confirmed",
    text: `Hi ${name}, You are registered for PANACHE 2K26. Your token is: ${token}. Roll No: ${rollNo}, Course: ${course}, Branch: ${branch}, Section: ${section}, Year: ${year}. Present this token at the admin desk at the event.`,
    html: `
      <h2>Hi ${name},</h2>
      <p>You are officially registered for PANACHE 2K26!</p>
      
      <div style="background-color: #121212; color: #CCFF00; padding: 20px; border: 2px solid #CCFF00; margin: 20px 0; display: inline-block;">
        <h3 style="margin: 0; color: #fff;">YOUR TOKEN:</h3>
        <h1 style="font-size: 40px; margin: 10px 0; letter-spacing: 5px;">${token}</h1>
        <p style="margin: 0; font-size: 14px; color: #ccc;">Keep this safe - you will need it at the venue</p>
      </div>

      <p><strong>Details:</strong><br/>
      Roll No: ${rollNo}<br/>
      Course: ${course} | Branch: ${branch}<br/>
      Section: ${section} | Year: ${year}</p>
      
      <p>Present this token to the admin desk at the event to register for individual competitions.</p>
      <p>See you at PANACHE 2K26!</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending registration email via SendGrid:", error);
    if ((error as any).response) {
      console.error((error as any).response.body);
    }
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
    if (!categories[ev.category]) {
      categories[ev.category] = [];
    }
    categories[ev.category].push(ev);
  });

  let eventsHtml = "";
  let eventsText = "";

  for (const [cat, evs] of Object.entries(categories)) {
    eventsHtml += `
      <div style="margin-bottom: 15px;">
        <h3 style="color: #333; margin-bottom: 5px; text-transform: uppercase;">Category: ${cat}</h3>
        <ul style="list-style-type: none; padding-left: 0; margin-top: 5px;">
    `;
    eventsText += `\nCategory: ${cat}\n`;

    evs.forEach((ev) => {
      const sub = ev.subEvent ? ` (${ev.subEvent})` : "";
      eventsHtml += `<li>${ev.eventName}${sub} - Rs.${ev.amount}</li>`;
      eventsText += `- ${ev.eventName}${sub} Rs.${ev.amount}\n`;
    });
    eventsHtml += `</ul></div>`;
  }

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: "PANACHE 2K26 - Your Event Registrations",
    text: `Hi ${name}, Here are the events you have been registered for:\n${eventsText}\nTotal Amount: Rs.${totalAmount}\nPlease keep this email as your registration receipt. Best of luck!`,
    html: `
      <h2>Hi ${name},</h2>
      <p>Here are the events you have been registered for:</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; margin: 20px 0;">
        ${eventsHtml}
        <hr style="border: 1px solid #ccc; margin: 20px 0;"/>
        <h2 style="margin: 0;">Total Amount: Rs.${totalAmount}</h2>
      </div>

      <p>Please keep this email as your registration receipt.</p>
      <p>Best of luck!</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending confirmation email via SendGrid:", error);
    if ((error as any).response) {
      console.error((error as any).response.body);
    }
    return false;
  }
};
