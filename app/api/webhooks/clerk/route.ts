import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createUser, deleteUser, updateUser } from '@/lib/actions/user.actions';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Verify the webhook using Svix
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  console.log("Using webhook secret:", body)
  const wh = new Webhook("whsec_+HMVKO5SOLmmcs/F/k4F8PRYKx9mncsu");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

    console.log('Received user.created event for user ID:',  { id, email_addresses, image_url, first_name, last_name, username });
    const user = {
      clerkId: id!,
      email: email_addresses[0].email_address,
      username: username || email_addresses[0].email_address.split('@')[0] || `user_${id}`,
      firstName: first_name ?? '',
      lastName: last_name ?? '',
      photo: image_url,
    };

    const newUser = await createUser(user);

    // Set public metadata on Clerk user
    if (newUser) {
      await clerkClient.users.updateUserMetadata(id!, {
        publicMetadata: {
          userId: newUser._id.toString(),
        },
      });
    }

    return NextResponse.json({ message: 'New user created' }, { status: 200 });
  }

  if (eventType === 'user.updated') {
    const { id, image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name ?? '',
      lastName: last_name ?? '',
      username: username || undefined, // Avoid overwriting with empty if not provided
      photo: image_url,
    };

    await updateUser(id!, user);

    return NextResponse.json({ message: 'User updated' }, { status: 200 });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    await deleteUser(id!);

    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  }

  return new Response('', { status: 200 });
}


// /* eslint-disable camelcase */
// import { clerkClient } from "@clerk/nextjs/server";
// import { WebhookEvent } from "@clerk/nextjs/server";
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import { Webhook } from "svix";
// import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

// export async function POST(req: Request) {
//   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET; // Changed to CLERK_WEBHOOK_SECRET for clarity
//   if (!WEBHOOK_SECRET) {
//     console.error("Missing CLERK_WEBHOOK_SECRET");
//     return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
//   }

//   const headerPayload = headers();
//   const svix_id = headerPayload.get("svix-id");
//   const svix_timestamp = headerPayload.get("svix-timestamp");
//   const svix_signature = headerPayload.get("svix-signature");

//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     console.error("Missing Svix headers");
//     return new Response("Missing Svix headers", { status: 400 });
//   }

//   const payload = await req.json();
//   const body = JSON.stringify(payload);

//   const wh = new Webhook(WEBHOOK_SECRET);
//   let evt: WebhookEvent;

//   try {
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error("Webhook verification failed:", err);
//     return new Response("Webhook verification failed", { status: 400 });
//   }

//   const { id } = evt.data;
//   const eventType = evt.type;

//   if (!id) {
//     console.error("Missing user ID in webhook event");
//     return new Response("Missing user ID", { status: 400 });
//   }

//   // CREATE
//   if (eventType === "user.created") {
//     const { email_addresses, image_url, first_name, last_name, username } = evt.data;
//     if (!email_addresses?.[0]?.email_address || !username) {
//       console.error("Missing required fields in user.created event");
//       return new Response("Missing required fields", { status: 400 });
//     }
//     const user = {
//       clerkId: id,
//       email: email_addresses[0].email_address,
//       username,
//       firstName: first_name || "",
//       lastName: last_name || "",
//       photo: image_url || "",
//     };
//     const newUser = await createUser(user);
//     if (!newUser) {
//       console.error("Failed to create user in MongoDB", id);
//       return new Response("Failed to create user", { status: 500 });
//     }
//     await clerkClient.users.updateUserMetadata(id, {
//       publicMetadata: {
//         userId: newUser._id,
//       },
//     });
//     return NextResponse.json({ message: "OK", user: newUser });
//   }

//   // UPDATE
//   if (eventType === "user.updated") {
//     const { image_url, first_name, last_name, username } = evt.data;
//     const user = {
//       firstName: first_name || undefined,
//       lastName: last_name || undefined,
//       username: username || undefined,
//       photo: image_url || undefined,
//     };
//     const updatedUser = await updateUser(id, user);
//     if (!updatedUser) {
//       console.error("Failed to update user in MongoDB", id);
//       return new Response("Failed to update user", { status: 500 });
//     }
//     return NextResponse.json({ message: "OK", user: updatedUser });
//   }

//   // DELETE
//   if (eventType === "user.deleted") {
//     const deletedUser = await deleteUser(id);
//     if (!deletedUser) {
//       console.error("Failed to delete user in MongoDB", id);
//       return new Response("Failed to delete user", { status: 500 });
//     }
//     return NextResponse.json({ message: "OK", user: deletedUser });
//   }

//   console.log(`Webhook processed: ID=${id}, Type=${eventType}`);
//   return new Response("", { status: 200 });
// }