# 検証用の捨てファイル

`main` に入れた branch protection が「設定として在る」だけでなく
「実際に効いている」ことを観測するためだけのファイルです。

未完了のときに `mergeStateStatus` が `BLOCKED`、緑になったら `CLEAN` へ反転することを見ます。
この PR はマージしません。確認後、PR を close して枝ごと削除します。
