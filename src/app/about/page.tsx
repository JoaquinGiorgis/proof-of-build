import { ShaderBackdrop } from "@/components/shader-backdrop";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "About" };

const FACTS = [
  {
    label: "What goes onchain",
    body: "The project name, the track, the event and the builder's wallet. Nothing else — a chain is public and indelible, so personal data never touches it.",
  },
  {
    label: "What the credential is",
    body: "A Token-2022 mint with the NonTransferable and TokenMetadata extensions. It cannot be sold or moved, because a record of what you built is not a tradable asset.",
  },
  {
    label: "Who signs",
    body: "The issuer signs the credential on the server; you sign as the fee payer from your own wallet. Your keys never leave it, and we never hold them.",
  },
  {
    label: "Which network",
    body: "Solana devnet. Nobody deploys a hackathon project to mainnet.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative isolate">
      <ShaderBackdrop className="opacity-40" height="h-[620px]" />

      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-5 pt-[150px] pb-16 md:px-10">
        <span className="type-meta text-text-tertiary">About</span>
        <h1 className="type-h1 text-text-primary max-w-[900px]">
          A verifiable record of what you actually shipped.
        </h1>
        <p className="type-body-l text-text-secondary max-w-[640px]">
          A CV says you built something. A Proof of Build says an issuer watched
          you do it, and anyone can check that claim without asking us.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-5 md:grid-cols-2 md:px-10">
        {FACTS.map((fact) => (
          <div key={fact.label} className="rule flex flex-col gap-4 pt-7">
            <span className="type-meta-l text-text-tertiary">{fact.label}</span>
            <p className="type-body-m text-text-secondary max-w-[440px]">
              {fact.body}
            </p>
          </div>
        ))}
      </section>

      <SiteFooter className="mt-28" />
    </div>
  );
}
