// frontend/tests/filters.test.ts

import { describe, expect, it } from "vitest"
import {
  normalizeDepartment,
  getSectionFilterOptions,
} from "@/lib/filters"
import type { ClassEntry } from "@/components/timetable/ClassCard"

describe("normalizeDepartment", () => {
  it("merges all undergraduate CS variants into CS", () => {
    expect(normalizeDepartment("BS")).toBe("CS")
    expect(normalizeDepartment("BS (CS)")).toBe("CS")
    expect(normalizeDepartment("BS (AI)")).toBe("CS")
    expect(normalizeDepartment("BS (CS-AI)")).toBe("CS")
    expect(normalizeDepartment("BS (SE)")).toBe("CS")
  })

  it("keeps postgraduate degrees separate from undergraduate CS", () => {
    expect(normalizeDepartment("MS")).toBe("MS")
    expect(normalizeDepartment("MS (CS)")).toBe("MS")
    expect(normalizeDepartment("MS (AI)")).toBe("MS")
    expect(normalizeDepartment("PhD")).toBe("PhD")
    expect(normalizeDepartment("PhD (CS, SE)")).toBe("PhD")
  })

  it("normalizes other degree variants", () => {
    expect(normalizeDepartment("B Ed")).toBe("B.Ed")
    expect(normalizeDepartment("BEd")).toBe("B.Ed")

    expect(normalizeDepartment("BE (CS)")).toBe("BE")
    expect(normalizeDepartment("BE (CSE)")).toBe("BE")
    expect(normalizeDepartment("BE (EE)")).toBe("BE")

    expect(normalizeDepartment("ME (EC)")).toBe("ME")
    expect(normalizeDepartment("ME (EE)")).toBe("ME")

    expect(normalizeDepartment("MPhil (II)")).toBe("MPhil")
  })

  it("keeps distinct undergraduate departments distinct", () => {
    expect(normalizeDepartment("BS (A&F)")).toBe("A&F")
    expect(normalizeDepartment("BS (Economics)")).toBe("Economics")
    expect(normalizeDepartment("BS (Maths)")).toBe("Mathematics")
    expect(normalizeDepartment("BS (Media)")).toBe("Media")
    expect(normalizeDepartment("BS (PE&SS)")).toBe("PE&SS")
  })

  it("returns null for unknown programs", () => {
    expect(normalizeDepartment("something-new")).toBeNull()
  })

  it("exposes additional extracted courses", () => {
    expect(normalizeDepartment("ADDITIONAL")).toBe("Additional")
  })
})

describe("getSectionFilterOptions", () => {
  const entries = [
    {
      id: 1,
      program: "BS (SE)",
      semester: 5,
      section: "A",
      course: "Software Engineering",
    },
    {
      id: 2,
      program: "BS (AI)",
      semester: 5,
      section: "B",
      course: "Artificial Intelligence",
    },
    {
      id: 3,
      program: "BS (AI)",
      semester: 5,
      section: "C",
      course: "Artificial Intelligence",
    },
    {
      id: 4,
      program: "BS (CS-AI)",
      semester: 5,
      section: "D",
      course: "Computer Science",
    },
    {
      id: 5,
      program: "BS (CS)",
      semester: 5,
      section: "H",
      course: "Computer Science",
    },
  ] as ClassEntry[]

  it("combines CS sections across different raw programs", () => {
    const result = getSectionFilterOptions(entries, {
      department: "CS",
      semester: 5,
    })

    expect(result.sections).toEqual([
      "A",
      "B",
      "C",
      "D",
      "H",
    ])
  })

  it("only exposes semesters belonging to the selected department", () => {
    const result = getSectionFilterOptions(entries, {
      department: "CS",
      semester: null,
    })

    expect(result.semesters).toEqual([5])
  })

  it("does not mix another department into CS", () => {
    const mixedEntries = [
      ...entries,
      {
        id: 6,
        program: "BS (Economics)",
        semester: 5,
        section: "A",
        course: "Economics",
      },
    ] as ClassEntry[]

    const result = getSectionFilterOptions(mixedEntries, {
      department: "CS",
      semester: 5,
    })

    expect(result.sections).toEqual([
      "A",
      "B",
      "C",
      "D",
      "H",
    ])
  })

  it("respects the selected semester", () => {
    const semesterEntries = [
      ...entries,
      {
        id: 7,
        program: "BS (CS)",
        semester: 6,
        section: "A",
        course: "Advanced Course",
      },
    ] as ClassEntry[]

    const result = getSectionFilterOptions(
      semesterEntries,
      {
        department: "CS",
        semester: 5,
      },
    )

    expect(result.sections).toEqual([
      "A",
      "B",
      "C",
      "D",
      "H",
    ])
  })

  it("returns departments in the canonical product order", () => {
    const result = getSectionFilterOptions(
      [
        {
          id: 1,
          program: "BS (Economics)",
          semester: 1,
          section: "A",
          course: "Economics",
        },
        {
          id: 2,
          program: "BS (CS)",
          semester: 5,
          section: "A",
          course: "Computer Science",
        },
        {
          id: 3,
          program: "BBA",
          semester: 2,
          section: "A",
          course: "Business",
        },
      ] as ClassEntry[],
      {
        department: "",
        semester: null,
      },
    )

    expect(result.departments).toEqual([
      "CS",
      "BBA",
      "Economics",
    ])
  })

  it("includes semester-zero additional sections", () => {
    const result = getSectionFilterOptions(
      [{
        id: 8,
        program: "ADDITIONAL",
        semester: 0,
        section: "DOBA",
        course: "Artificial Intelligence for Business and Economics",
      }] as ClassEntry[],
      { department: "Additional", semester: null },
    )

    expect(result.semesters).toEqual([0])
    expect(result.sections).toEqual(["DOBA"])
  })
})