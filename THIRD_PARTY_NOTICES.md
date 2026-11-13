# Third-party notices

## Kanji alive language data

This project imports and adapts the `language-data/ka_data.csv` file from:
https://github.com/kanjialive/kanji-data-media

Attribution: Kanji alive by Harumi Hibino Lory and Arno Bosse.
License: Creative Commons Attribution 4.0 International (CC BY 4.0):
https://creativecommons.org/licenses/by/4.0/

Changes made by Kanotoba: selected language data are parsed from CSV, normalized into relational tables, assigned Kanotoba-local numeric IDs, and served through a custom API. The original `kname` field is retained as `source_key`.

Kanotoba is an independent project and is not affiliated with or endorsed by Kanji alive.

The upstream repository states that some materials are excluded from the license/data archive due to copyright restrictions, including mnemonic hints, certain dictionary indices and textbook lesson/chapter organization. The importer does not import those fields or any media files. Two fonts in the upstream repository have separate licenses; Kanotoba does not import those fonts.

The included `scripts/fixtures/kanji-mini.csv` is a tiny test fixture adapted from the upstream `ka_data.csv` and is covered by the same attribution above.
