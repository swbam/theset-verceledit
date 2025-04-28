import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import ShowDetailClient from "./ShowDetailClient";
import { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ShowPage({ params }: { params: { showId: string } }) {
  const supabase = createServerComponentClient<Database>({ cookies });
  
  // Fetch show details
  const { data: show, error } = await supabase
    .from("shows")
    .select("*")
    .eq("id", params.showId)
    .single();

  if (error || !show) {
    notFound();
  }

  return <ShowDetailClient show={show} />;
}
