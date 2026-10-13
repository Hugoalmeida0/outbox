import { describe, expect, it } from "vitest";
import { canonizar, detectarMotor, hostCasaPadrao, padroesHostDoMotor } from "./motores.ts";
import { ErroValidacao } from "../compartilhado/erros.ts";

describe("canonizar", () => {
  it.each([
    // greenhouse
    [
      "https://job-boards.greenhouse.io/nubank/jobs/123?gh_src=abc&utm_source=x",
      "greenhouse",
      "https://job-boards.greenhouse.io/nubank/jobs/123",
    ],
    [
      "https://boards.greenhouse.io/nubank/jobs/123",
      "greenhouse",
      "https://job-boards.greenhouse.io/nubank/jobs/123",
    ],
    [
      "https://job-boards.eu.greenhouse.io/acme/jobs/9#app",
      "greenhouse",
      "https://job-boards.eu.greenhouse.io/acme/jobs/9",
    ],
    [
      "https://boards.greenhouse.io/embed/job_app?for=inter&token=777",
      "greenhouse",
      "https://job-boards.greenhouse.io/inter/jobs/777",
    ],
    // lever
    [
      "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666/apply?lever-source=LinkedIn",
      "lever",
      "https://jobs.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666",
    ],
    [
      "https://jobs.eu.lever.co/acme/0F8E4C7A-1111-2222-3333-444455556666",
      "lever",
      "https://jobs.eu.lever.co/acme/0f8e4c7a-1111-2222-3333-444455556666",
    ],
    // ashby
    [
      "https://jobs.ashbyhq.com/ramp/0f8e4c7a-1111-2222-3333-444455556666/application?utm_campaign=y",
      "ashby",
      "https://jobs.ashbyhq.com/ramp/0f8e4c7a-1111-2222-3333-444455556666",
    ],
    [
      "https://jobs.ashbyhq.com/ramp/0f8e4c7a-1111-2222-3333-444455556666",
      "ashby",
      "https://jobs.ashbyhq.com/ramp/0f8e4c7a-1111-2222-3333-444455556666",
    ],
    // gupy
    [
      "https://empresa.gupy.io/jobs/1234567?jobBoardSource=gupy_public_page",
      "gupy",
      "https://empresa.gupy.io/jobs/1234567",
    ],
    ["https://empresa.gupy.io/job/1234567/", "gupy", "https://empresa.gupy.io/jobs/1234567"],
    [
      "https://portal.gupy.io/job-search/term=dev?utm_source=a",
      "gupy",
      "https://portal.gupy.io/job-search/term=dev",
    ],
    // inhire
    [
      "https://empresa.inhire.app/vagas/abc-123/dev?utm_source=li",
      "inhire",
      "https://empresa.inhire.app/vagas/abc-123/dev",
    ],
    ["https://outra.inhire.app/vagas/x/", "inhire", "https://outra.inhire.app/vagas/x"],
    // smartrecruiters
    [
      "https://jobs.smartrecruiters.com/Visa/744000012345678-dev?trid=1",
      "smartrecruiters",
      "https://jobs.smartrecruiters.com/Visa/744000012345678-dev?trid=1",
    ],
    [
      "https://jobs.smartrecruiters.com/Acme/1-x/",
      "smartrecruiters",
      "https://jobs.smartrecruiters.com/Acme/1-x",
    ],
    // workable
    [
      "https://apply.workable.com/acme/j/ABC123/?utm_medium=x",
      "workable",
      "https://apply.workable.com/acme/j/ABC123",
    ],
    [
      "https://apply.workable.com/acme/j/ABC123/apply/",
      "workable",
      "https://apply.workable.com/acme/j/ABC123/apply",
    ],
    // teamtailor
    [
      "https://acme.teamtailor.com/jobs/123-dev?promotion=1&ref=x",
      "teamtailor",
      "https://acme.teamtailor.com/jobs/123-dev?promotion=1",
    ],
    [
      "https://career.teamtailor.com/jobs/9-a/",
      "teamtailor",
      "https://career.teamtailor.com/jobs/9-a",
    ],
    // agregadores e github
    [
      "https://www.linkedin.com/jobs/view/3912345678/?trk=public_jobs",
      "linkedin",
      "https://www.linkedin.com/jobs/view/3912345678",
    ],
    [
      "https://br.linkedin.com/jobs/view/dev-senior-at-acme-3912345678",
      "linkedin",
      "https://www.linkedin.com/jobs/view/3912345678",
    ],
    [
      "https://www.linkedin.com/jobs/search/?currentJobId=3912345678&keywords=dev",
      "linkedin",
      "https://www.linkedin.com/jobs/view/3912345678",
    ],
    [
      "https://br.indeed.com/viewjob?jk=abc123&from=serp",
      "indeed",
      "https://br.indeed.com/viewjob?jk=abc123",
    ],
    [
      "https://www.indeed.com.br/jobs?q=dev&vjk=def456",
      "indeed",
      "https://br.indeed.com/viewjob?jk=def456",
    ],
    [
      "https://github.com/backend-br/vagas/issues/12345#issuecomment-1",
      "github",
      "https://github.com/backend-br/vagas/issues/12345",
    ],
    // domínio próprio
    [
      "https://www.carreiras.itau.com.br/vaga/123/?utm_source=x&b=2&a=1",
      "dominio:carreiras.itau.com.br",
      "https://www.carreiras.itau.com.br/vaga/123?a=1&b=2",
    ],
  ])("canoniza %s", (entrada, motor, canonica) => {
    const resultado = canonizar(entrada);
    expect(resultado.motor).toBe(motor);
    expect(resultado.canonica).toBe(canonica);
  });

  it("detecta workday, oracle, successfactors, cornerstone e eightfold", () => {
    expect(
      canonizar("https://accenture.wd103.myworkdayjobs.com/pt-BR/AccentureCareers/job/x").motor,
    ).toBe("workday");
    expect(
      canonizar(
        "https://e123.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/pt-BR/sites/CX/job/1",
      ).motor,
    ).toBe("oracle");
    expect(canonizar("https://e123.fa.us2.oraclecloud.com/outra/coisa").motor).toBe(
      "dominio:e123.fa.us2.oraclecloud.com",
    );
    expect(canonizar("https://career5.successfactors.eu/career?company=x").motor).toBe(
      "successfactors",
    );
    expect(canonizar("https://acme.csod.com/ux/ats/careersite/1/home/requisition/2").motor).toBe(
      "cornerstone",
    );
    expect(canonizar("https://meli.eightfold.ai/careers/job/1").motor).toBe("eightfold");
    expect(canonizar("https://github.com/frontendbr/vagas").motor).toBe("dominio:github.com");
  });

  it.each(["não é url", "ftp://exemplo.com/vaga", ""])(
    "rejeita entrada inválida: %s",
    (entrada) => {
      expect(() => canonizar(entrada)).toThrow(ErroValidacao);
    },
  );
});

describe("hostCasaPadrao", () => {
  it.each([
    ["empresa.gupy.io", "*.gupy.io", true],
    ["gupy.io", "*.gupy.io", false],
    ["a.b.myworkdayjobs.com", "*.myworkdayjobs.com", true],
    ["evil-gupy.io", "*.gupy.io", false],
    ["linkedin.com", "linkedin.com", true],
    ["www.linkedin.com", "linkedin.com", false],
  ])("%s x %s = %s", (host, padrao, esperado) => {
    expect(hostCasaPadrao(host, padrao)).toBe(esperado);
  });

  it("expõe os padrões do motor e nada para domínios próprios", () => {
    expect(padroesHostDoMotor("workday")).toEqual(["*.myworkdayjobs.com"]);
    expect(padroesHostDoMotor("dominio:x.com")).toEqual([]);
  });

  it("detectarMotor remove www. do domínio próprio", () => {
    expect(detectarMotor(new URL("https://www.vagas.com.br/vagas/v1"))).toBe(
      "dominio:vagas.com.br",
    );
  });
});
