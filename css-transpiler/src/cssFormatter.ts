import type * as postcss from "postcss";

// フォーマッターのオプション
type Options = {
  // インデントのスペース数（デフォルト: 2）
  indent?: number;
};

// PostCSSノードのrawsプロパティの型定義
type NodeRaws = {
  // ノードの前の空白文字
  before?: string;
  // セレクタと{の間、プロパティと値の間の空白文字
  between?: string;
  // ノードの後の空白文字
  after?: string;
  // セミコロンの有無
  semicolon?: boolean;
};

// フォーマット可能なPostCSSノード
type FormattableNode = postcss.Node & {
  raws: NodeRaws;
  // 子ノード（コンテナノードのみ）
  nodes?: postcss.Node[];
  // パラメータ（atruleのみ）
  params?: string;
};

// プラグイン構築関数
const plugin = (opts: Options = {indent: 2}): postcss.Plugin => {
  const indentSize = opts.indent ?? 2;
  const indent = " ".repeat(indentSize);

  // rawsプロパティを確実に取得する
  const ensureRaw = (obj: FormattableNode): NodeRaws => {
    if (!obj.raws) obj.raws = {};
    return obj.raws;
  };

  // 指定された深さのインデント文字列を取得
  const getIndent = (depth: number): string =>
    indent.repeat(Math.max(0, depth));

  // 改行とインデントを含む文字列を生成
  const newlineWithIndent = (depth: number): string =>
    "\n" + getIndent(depth);

  // コンテナノード（子ノードを持つノード）をフォーマット
  const formatContainer = (container: postcss.Container, depth: number): void => {
    if (!container?.nodes) return;

    container.nodes.forEach((child, i) => {
      const node = child as FormattableNode;
      const raws = ensureRaw(node);
      // 最初の子ノード以外は改行とインデントを追加
      if (!raws.before) {
        raws.before = i === 0 ? "" : newlineWithIndent(depth);
      }
      formatNode(node, depth);
    });
  };

  // ブロックノード（ruleやatrule）をフォーマット
  const formatBlockNode = (node: FormattableNode, depth: number): void => {
    const raws = ensureRaw(node);

    if (node.nodes?.length) {
      // ネストされたルールの場合、深さを調整
      const childDepth = depth === 0 ? depth + 1 : depth;
      formatContainer(node as unknown as postcss.Container, childDepth);
      raws.after = newlineWithIndent(depth);
    } else {
      raws.after = raws.after || "\n";
    }
  };

  // ノードの種類に応じてフォーマットを適用
  const formatNode = (node: FormattableNode, depth: number): void => {
    const raws = ensureRaw(node);

    switch (node.type) {
      case "root":
        // ルートノード: 前の空白なし、最後に改行
        raws.before = "";
        formatContainer(node as postcss.Container, 0);
        raws.after = "\n";
        break;

      case "rule":
        // CSSルール: 各ルールの前に改行を追加
        raws.before = newlineWithIndent(depth - 1);
        raws.between = raws.between || " ";
        formatBlockNode(node, depth);
        break;

      case "atrule":
        // @ルール（@media, @keyframesなど）
        raws.before = depth === 0 ? "" : newlineWithIndent(depth - 1);
        raws.between = raws.between || (node.params ? " " : "");
        formatBlockNode(node, depth);
        break;

      case "decl":
        // プロパティ宣言: インデント付きで改行
        raws.before = newlineWithIndent(depth);
        raws.between = ": ";
        break;

      case "comment":
        // コメント: インデント付きで改行
        raws.before = newlineWithIndent(depth);
        break;

      default:
        // その他のノード
        if (node.nodes?.length) {
          raws.before = depth === 0 ? raws.before || "" : newlineWithIndent(depth);
          formatContainer(node as unknown as postcss.Container, depth + 1);
          raws.after = raws.after || newlineWithIndent(depth);
        }
        break;
    }
  };

  const plugin: postcss.Plugin = {
    postcssPlugin: "postcss-css-formatter",
    Root(root: postcss.Root) {
      formatNode(root as FormattableNode, 0);
    },
  };

  return plugin;
};

plugin.postcss = true;

export default plugin;
