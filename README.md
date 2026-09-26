# Villanyvizsga – jelszavas webes kiadás

A kérdésbank, a megoldások, a számolási útmutató és a szükséges ábrakivágások titkosított `.vve` állományokban vannak. A böngésző a jelszó megadása után helyben oldja fel őket. A jelszó és a teljes eredeti feladatlap-PDF-ek nincsenek ebben a repóban.

A nyitott mesterpéldány és az eredeti PDF-ek kizárólag a készítő számítógépén, a külön `site/` mappában maradnak. A titkosító építőszkript a két webes mappa mellett, a GitHub-repón kívül található.

A [GitHub Pages oldal](https://tgpztt.github.io/villanyvizsga/) HTTPS alatt közvetlenül használható. Helyi letöltésből a böngészőben csak helyi HTTP-kiszolgálóval futtatható, mert a titkosított állományokat a böngésző `fetch` kéréssel tölti be.
