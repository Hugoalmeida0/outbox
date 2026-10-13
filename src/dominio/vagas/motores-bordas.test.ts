// URLs do motor conhecido, mas fora do padrão de vaga: caem na canônica genérica (sem rastreamento).
import { describe, expect, it } from "vitest";
import { canonizar } from "./motores.ts";

describe("canonizar: fallback genérico", () => {
  it.each([
    ["https://acme.com.br/", "https://acme.com.br/"],
    ["https://boards.greenhouse.io/acme?utm_source=x", "https://boards.greenhouse.io/acme"],
    [
      "https://boards.greenhouse.io/embed/job_app?for=acme",
      "https://boards.greenhouse.io/embed/job_app?for=acme",
    ],
    ["https://jobs.lever.co/acme/", "https://jobs.lever.co/acme"],
    ["https://empresa.gupy.io/", "https://empresa.gupy.io/"],
    [
      "https://www.linkedin.com/jobs/collections/recommended/",
      "https://www.linkedin.com/jobs/collections/recommended",
    ],
    ["https://br.indeed.com/jobs?q=dev&from=serp", "https://br.indeed.com/jobs?from=serp&q=dev"],
  ])("%s → %s", (entrada, esperada) => {
    expect(canonizar(entrada).canonica).toBe(esperada);
  });

  it("Indeed fora do Brasil mantém o host", () => {
    expect(canonizar("https://www.indeed.com/viewjob?jk=zz9&from=serp").canonica).toBe(
      "https://www.indeed.com/viewjob?jk=zz9",
    );
  });
});
