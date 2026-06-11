import { useState } from "react";
import { Link } from "react-router-dom";
import StoryCard from "../components/StoryCard";
import { stories, categories } from "../data/stories";
import styles from "./Home.module.css";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tümü");

  const filtered =
    activeCategory === "Tümü"
      ? stories
      : stories.filter((s) => s.category === activeCategory);

  const featured = stories[2]; // En çok beğenilen

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.heroEyebrow}>Gerçek Hayat Hikayeleri</p>
            <h1 className={styles.heroTitle}>
              Anlatılmamış
              <br />
              <em>her hikaye</em>
              <br />
              bizi bekliyor.
            </h1>
            <p className={styles.heroDesc}>
              Hayat hikayelerini kitap formatında paylaş. Başkalarının anlatılmamış
              dünyalarına kap ara. Unutulmaya bırakma — yaz.
            </p>
            <div className={styles.heroCta}>
              <Link to="/yaz" className={styles.ctaPrimary}>
                Hikayeni Yaz
              </Link>
              <Link to="/kesif" className={styles.ctaSecondary}>
                Keşfet
              </Link>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <span className={styles.statNum}>2.400+</span>
                <span className={styles.statLabel}>Hikaye</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>18.000+</span>
                <span className={styles.statLabel}>Okuyucu</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>140+</span>
                <span className={styles.statLabel}>Şehir</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.bookStack}>
              {stories.slice(0, 4).map((s, i) => (
                <div
                  key={s.id}
                  className={styles.stackBook}
                  style={{
                    background: s.coverColor,
                    transform: `rotate(${[-3, 2, -1, 4][i]}deg) translateY(${[0, -8, -16, -22][i]}px)`,
                    zIndex: 4 - i,
                  }}
                >
                  <span className={styles.stackBookTitle}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.heroWave}>
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 40 Q360 80 720 40 Q1080 0 1440 40 L1440 80 L0 80 Z" fill="var(--cream)" />
          </svg>
        </div>
      </section>

      {/* Öne Çıkan */}
      <section className={styles.featured}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Bu Haftanın Hikayesi</h2>
          </div>
          <Link to={`/hikaye/${featured.id}`} className={styles.featuredCard}>
            <div
              className={styles.featuredCover}
              style={{ background: featured.coverColor }}
            >
              <div className={styles.featuredCoverContent}>
                <span className={styles.featuredBadge}>Öne Çıkan</span>
                <h3 className={styles.featuredCoverTitle}>{featured.title}</h3>
                <p className={styles.featuredCoverSub}>{featured.subtitle}</p>
              </div>
            </div>
            <div className={styles.featuredBody}>
              <span className={styles.featuredCategory}>{featured.category}</span>
              <h3 className={styles.featuredTitle}>{featured.title}</h3>
              <p className={styles.featuredSub}>{featured.subtitle}</p>
              <p className={styles.featuredPreview}>{featured.preview}</p>
              <div className={styles.featuredMeta}>
                <div className={styles.featuredAuthor}>
                  <div className={styles.featuredAvatar}>{featured.authorAvatar}</div>
                  <div>
                    <p className={styles.featuredAuthorName}>{featured.author}</p>
                    <p className={styles.featuredAuthorBio}>{featured.authorBio}</p>
                  </div>
                </div>
                <span className={styles.readMoreBtn}>Okumaya Başla →</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Hikayeler */}
      <section className={styles.storiesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Keşfet</h2>
            <Link to="/kesif" className={styles.seeAll}>Tümünü Gör →</Link>
          </div>

          <div className={styles.categories}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.catBtn} ${activeCategory === cat ? styles.catActive : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {filtered.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>

      {/* Çağrı */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <p className={styles.ctaEyebrow}>Senin de bir hikayein var</p>
            <h2 className={styles.ctaTitle}>
              Yazmaya bugün başla.
            </h2>
            <p className={styles.ctaDesc}>
              Ücretsiz üye ol, hikayeni kendi hızında yaz.
              Hazır olduğunda paylaş.
            </p>
            <Link to="/kayit" className={styles.ctaPrimaryLarge}>
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
