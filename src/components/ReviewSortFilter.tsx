"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ReviewSortFilter({ courses, currentSort, currentCourse }: {
  courses: { id: string; code: string }[]; currentSort: string; currentCourse: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const sorts = [
    { key: "newest", label: "Newest" }, { key: "oldest", label: "Oldest" },
    { key: "highest", label: "Highest Rated" }, { key: "lowest", label: "Lowest Rated" },
  ];

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sorts.map((s) => (
          <button key={s.key} onClick={() => update("sort", s.key === "newest" ? null : s.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${currentSort === s.key ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {courses.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => update("course", null)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${!currentCourse ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>All Courses</button>
          {courses.map((c) => (
            <button key={c.id} onClick={() => update("course", c.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${currentCourse === c.id ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>{c.code}</button>
          ))}
        </div>
      )}
    </div>
  );
}
