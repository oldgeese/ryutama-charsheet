# キャラクターシートの項目（Issue #5）

- 関連 Issue: #3（サイトの大まかな条件）、#5（シート項目の定義）
- 日付: 2026-10-21
- 参照: ルールブックの旅人キャラクターシート（p.174〜175）、プレイヤーキャラクター作成（p.22）、旅人のレベルアップ（p.42）

## 方針

- 扱うのは旅人（PC）のシートだけ。竜人（GM）のシートは扱わない
- 型を付けるのは、一覧・検索に使う項目と、値の範囲がルールで決まっている項目だけ（レベル、EXP、クラス、タイプ、能力値）
- それ以外はシートに書き込むのと同じように自由な文字列にする。HP や修正値のように数値の欄も、空欄や「+1」のような書き方を許すため文字列にする
- 表の行（クラス能力、武器、盾・鎧、旅装）は配列にする。紙のシートの行数（6、2、2、4）では制限しない
- 用語はルールブックの表記のまま。クラスとタイプは日本語の文字列リテラル、地形・天候・状態異常は Record のキーにする

## 置き場所

`packages/character`（`@ryutama/character`）に置き、Web と Functions の両方から使う。

- `rules.ts` — クラス、タイプ、能力値のダイス、地形、天候、状態異常、レベルの範囲
- `sheet.ts` — `CharacterSheet` と、新規作成の初期値 `emptySheet`
- `summary.ts` — 一覧用の `CharacterSummary` と、シートから作る `toSummary`

パッケージは TypeScript のソースをそのまま公開する（ビルドしない）。Web は Vite がそのまま読める。Functions はデプロイ時に依存を npm から入れ直すので、#6 で Functions をバンドルするようにして取り込む。

## 項目

| 項目 | キー | 型 |
|---|---|---|
| 竜人名、作成日、キャラクター名、プレイヤー名、性別、年齢 | `dragonName` `createdOn` `characterName` `playerName` `gender` `age` | 文字列 |
| レベル | `level` | 1〜10 の整数 |
| EXP | `exp` | 0 以上の整数 |
| クラス | `classes` | 7 クラスのどれか。重複ありで最大 2 つ（レベル 5 で追加） |
| タイプ | `types` | アタック／テクニック／マジックタイプのどれか。重複ありで最大 2 つ（レベル 6 で追加） |
| クラス能力 | `classAbilities` | `{ name, checkAbilities, effect }` の配列 |
| 習得武器、得意地形／天候、お気に入りアイテム | `weaponProficiency` `favoredTerrainAndWeather` `favoriteItem` | 文字列 |
| イメージカラー／外見、故郷／旅に出た理由、MEMO | `appearance` `hometownAndReason` `memo` | 文字列 |
| 能力値（体力、敏捷、知力、精神） | `abilities.{strength,dexterity,intelligence,spirit}` | 4、6、8、10、12 のどれか |
| HP、MP | `hp` `mp` | `{ max, current }`（文字列） |
| コンディション、1 ゾロポイント、イニシアティブ | `condition` `fumblePoints` `initiative` | 文字列 |
| 武器 | `weapons` | `{ name, accuracy, damage, durability, notes }` の配列 |
| 盾・鎧 | `armors` | `{ name, defense, penalty, durability, notes }` の配列 |
| 旅装 | `travelGear` | `{ name, notes }` の配列 |
| 地形ごとのチェックボーナス | `terrainBonuses` | 11 の地形すべてをキーに持つ Record（値は文字列） |
| 天候ごとのチェックペナルティ | `weatherPenalties` | 11 の天候すべてをキーに持つ Record（値は文字列） |
| 状態異常 | `statusEffects` | 6 つの状態異常すべてをキーに持つ Record（値は文字列） |

一覧用の `CharacterSummary` は、キャラクター名、プレイヤー名、レベル、クラス、タイプ。

`emptySheet` は、レベル 1、EXP 0、能力値はすべて 6（平均型セット）、ほかは空にする。

## 扱わないもの

- キャラクターの画像（シート右上の枠）
- 持ち物（シートに欄がないので MEMO に書いてもらう）
- 竜人のシート
- 最大 HP = 体力 × 2 のような自動計算
