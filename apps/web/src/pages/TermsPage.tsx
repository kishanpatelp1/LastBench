export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          By accessing and using LastBench, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
        <p className="text-muted-foreground leading-relaxed">
          LastBench provides an anonymous campus social platform. We are not responsible for the content posted by users, though we maintain strict moderation policies against harassment, hate speech, and illegal content.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">3. User Conduct</h2>
        <p className="text-muted-foreground leading-relaxed">
          Users agree not to use the platform to:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
          <li>Post content that is unlawful, harmful, threatening, abusive, or harassing.</li>
          <li>Impersonate any person or entity.</li>
          <li>Upload or transmit viruses or any other type of malicious code.</li>
          <li>Attempt to deanonymize other users on the platform.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">4. Termination</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
      </section>
    </div>
  );
}
