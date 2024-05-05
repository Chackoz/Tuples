import EmailTemplate from "@/app/components/EmailTemplate";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest, response: NextResponse) {
  const body = await req.json;
  if (!body) {
    throw new Error("Request body is empty");
  }
  const { name, email, password }: { name: string; email: string; password: string } =
    (await req.json()) as { name: string; email: string; password: string };

  try {
    const data = await resend.emails.send({
      from: "Tuples <onboarding@resend.dev>",
      to: ["adiadithyakrishnan@gmail.com"],
      subject: "Onboarding Tuple",
      react: EmailTemplate({
        name: name,
        email: email,
        password: password
      })
    });

    return NextResponse.json(data);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error });
  }
}
