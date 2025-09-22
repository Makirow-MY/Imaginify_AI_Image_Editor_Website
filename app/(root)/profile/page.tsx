import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Collection } from "@/components/shared/Collection";
import Header from "@/components/shared/Header";
import { getUserImages } from "@/lib/actions/image.actions";
import { getUserById } from "@/lib/actions/user.actions";

interface SearchParamProps {
  searchParams: Promise<{ page?: string }>;
}

const Profile = async ({ searchParams }: SearchParamProps) => {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const { userId } = await auth();
  console.log("UserID in profile page:", userId);
  if (!userId) redirect("/sign-in");
  const user = await getUserById(userId);
  if (!user) {
    console.error("User not found in MongoDB", userId, "userId", user, "user");
    redirect("/sign-in"); // Redirect if user not found in MongoDB
  }
  const images = await getUserImages({ page, userId: user._id });
  return (
    <>
      <Header title="Profile" />
      <section className="profile">
        <div className="profile-balance">
          <p className="p-14-medium md:p-16-medium">CREDITS AVAILABLE</p>
          <div className="mt-4 flex items-center gap-4">
            <Image
              src="/assets/icons/coins.svg"
              alt="coins"
              width={50}
              height={50}
              className="size-9 md:size-12"
            />
            <h2 className="h2-bold text-dark-600">{user.creditBalance ?? 0}</h2>
          </div>
        </div>
        <div className="profile-image-manipulation">
          <p className="p-14-medium md:p-16-medium">IMAGE MANIPULATION DONE</p>
          <div className="mt-4 flex items-center gap-4">
            <Image
              src="/assets/icons/photo.svg"
              alt="photo"
              width={50}
              height={50}
              className="size-9 md:size-12"
            />
            <h2 className="h2-bold text-dark-600">{images?.data?.length ?? 0}</h2>
          </div>
        </div>
      </section>
      <section className="mt-8 md:mt-14">
        <Collection
          images={images?.data ?? []}
          totalPages={images?.totalPages ?? 1}
          page={page}
        />
      </section>
    </>
  );
};

export default Profile;