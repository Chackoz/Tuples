import { Resend } from "resend";

type emailProps = {
  name: string;
  email: string;
  password: string;
};

export default async function sendEmail(props: emailProps) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    resend.emails.send({
      from: "onboarding@resend.dev",
      to: "adiadithyakrishnan@gmail.com",
      subject: "Hello World",
      html: "<p>Congrats on sending your <strong>first email</strong>!</p>"
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
