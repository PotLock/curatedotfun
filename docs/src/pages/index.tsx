import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";
import Head from "@docusaurus/Head";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/user-guides/curation"
          >
            Start Curating
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Learn More
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Deploy AI Content Curation Agents`}
      description="curate.fun lets you curate news directly on socials and turn feeds into regular content."
    >
      <Head>
        <meta
          property="og:title"
          content="curate.fun - Deploy AI Content Curation Agents"
        />
        <meta
          property="og:description"
          content="curate.fun lets you curate news directly on socials and turn feeds into regular content."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://docs.curate.fun" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="curate.fun - AI Content Curation" />
        <meta
          name="twitter:description"
          content="curate.fun lets you curate news directly on socials and turn feeds into regular content."
        />
        <meta property="og:image" content="/img/meta.png" />
        <meta property="twitter:image" content="/img/meta.png" />
        <meta
          name="keywords"
          content="curate, news, socials, content, feeds, curate.fun, AI, curation, social media, content creation"
        />
      </Head>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
