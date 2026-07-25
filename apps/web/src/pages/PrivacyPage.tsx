export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-24 md:py-12 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">
          When you use LastBench, we collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, avatar, college, branch, and any other information you choose to provide.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">2. How We Use Information</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use the information we collect about you to:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
          <li>Provide, maintain, and improve our Services.</li>
          <li>Perform internal operations, including troubleshooting, data analysis, testing, and research.</li>
          <li>Send or facilitate communications between users (e.g., in anonymous or public posts).</li>
          <li>Personalize and improve the Services.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">3. Google User Data</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you choose to log in using Google, we will access your Google profile information (Name, Email Address, and Profile Picture) to create and authenticate your account. We do not sell or share this data with third parties. Your data is used exclusively to provide core functionality on LastBench.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">4. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you have any questions about this Privacy Policy, please contact us at support@lastbench.app.
        </p>
      </section>
    </div>
  );
}
