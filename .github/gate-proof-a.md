# 検証用の捨てファイル（段1-0 / Arm A）

この PR は `.github/**` だけを触ります。
`Test Workflow` の `check_paths` が packages / desktop のどちらも変更なしと判定し、
`test_all` と `test_desktop` が SKIPPED になることを狙っています。

測るのは「SKIPPED な required check がマージを止めるか」の1点だけです。
測定後、枝ごと削除します。
