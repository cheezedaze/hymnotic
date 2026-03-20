import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

function getSegmentId(): string {
  const segmentId = process.env.RESEND_AUDIENCE_ID;
  if (!segmentId) {
    throw new Error("RESEND_AUDIENCE_ID environment variable is not set");
  }
  return segmentId;
}

export async function addContactToNewsletter(
  email: string,
  firstName?: string
) {
  const resend = getResend();
  const segmentId = getSegmentId();

  const { data, error } = await resend.contacts.create({
    email,
    firstName: firstName || undefined,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  } as Parameters<typeof resend.contacts.create>[0]);

  if (error) {
    throw new Error(`Resend contacts.create failed: ${JSON.stringify(error)}`);
  }

  return data;
}

export async function removeContactFromNewsletter(email: string) {
  const resend = getResend();

  // Look up the contact by email to get its ID
  const { data: contact, error: lookupError } = await resend.contacts.get({
    email,
  } as Parameters<typeof resend.contacts.get>[0]);

  if (lookupError || !contact) {
    console.warn("Could not find contact to unsubscribe:", email, lookupError);
    return;
  }

  const { error: updateError } = await resend.contacts.update({
    id: contact.id,
    unsubscribed: true,
  } as Parameters<typeof resend.contacts.update>[0]);

  if (updateError) {
    throw new Error(
      `Resend contacts.update failed: ${JSON.stringify(updateError)}`
    );
  }
}
