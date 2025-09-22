"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server"; // Import for Clerk Backend API
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

// Define TypeScript interfaces for type safety
interface CreateUserParams {
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  photo: string;
}

interface UpdateUserParams {
  firstName?: string;
  lastName?: string;
  username?: string;
  photo?: string;
}

// CREATE
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();
    console.log("Creating user in MongoDB", user);
    const existingUser = await User.findOne({ clerkId: user.clerkId });
    if (existingUser) {
      console.log("User already exists in MongoDB", user.clerkId);
      return JSON.parse(JSON.stringify(existingUser));
    }
    const newUser = await User.create(user);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
    return undefined; // Return undefined instead of throwing
  }
}

// READ (with fallback creation if user missing in MongoDB)
export async function getUserById(userId: string) {
  try {
    await connectToDatabase();
    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      // Fallback: Fetch from Clerk and create if missing (safety net for missed webhooks)
     const client = await clerkClient(); // Call clerkClient to get the instance
      const clerkUser = await client.users.getUser(userId);

      if (!clerkUser) {
         console.error("Clerk user not found", userId);
        return null;
      }
        console.log("MongoDB user not found; fetching from Clerk and creating...", userId,"clerkUser",clerkUser);
    
      const newUserData: CreateUserParams = {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] || `user_${userId}`,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        photo: clerkUser.imageUrl || "",
      };
      user = await createUser({
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] || `user_${userId}`,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        photo: clerkUser.imageUrl || "",
      });
      if (user) {
        // Set public metadata in Clerk (like in webhook)
        const client = await clerkClient(); // Call clerkClient to get the instance
      const clerkUser = await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            userId: user._id.toString(),
          },
        });

        console.log("User created successfully via fallback", userId);
      } else {
        console.error("Failed to create user via fallback", userId);
        return null;
      }
    }
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
    return undefined;
  }
}

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();
    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });
    if (!updatedUser) {
      console.log("User update failed", clerkId);
      return null;
    }
    revalidatePath("/profile"); // Revalidate profile page after update
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
    return undefined;
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase();
    const userToDelete = await User.findOne({ clerkId });
    if (!userToDelete) {
      console.log("User not found", clerkId);
      return null;
    }
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");
    revalidatePath("/profile");
    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
    return undefined;
  }
}

// USE CREDITS
export async function updateCredits(userId: string, creditFee: number) {
  try {
    await connectToDatabase();
    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee } },
      { new: true }
    );
    if (!updatedUserCredits) {
      console.log("User credits update failed", userId);
      return null;
    }
    revalidatePath("/profile"); // Revalidate profile to reflect credit changes
    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
    return undefined;
  }
}