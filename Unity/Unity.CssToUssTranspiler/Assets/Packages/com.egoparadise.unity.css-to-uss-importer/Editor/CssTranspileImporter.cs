using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using UnityEditor.AssetImporters;
using UnityEngine;
using UnityEngine.UIElements;

namespace EgoParadise.Unity.Utility.Editor
{
    // https://github.com/needle-mirror/com.unity.ui/blob/master/Editor/StyleSheets/StyleSheetImporter.cs
    // .css をインポートして .uss にトランスパイルするImporter
    [ScriptedImporter(1, "css")]
    public class CssTranspileImporter : ScriptedImporter
    {
        private static readonly ConstructorInfo ImporterImplConstructor;
        private static readonly MethodInfo ImporterImplImportMethod;
        private static readonly PropertyInfo ImporterImplDisableValidationProperty;

        static CssTranspileImporter()
        {
            // Note: Unityの持つ.ussのImporterを取得
            var styleSheetImporterType = Assembly.GetAssembly(typeof(ScriptedImporter)).GetType("UnityEditor.UIElements.StyleSheets.StyleSheetImporterImpl", throwOnError: true);
            var constructor = styleSheetImporterType.GetConstructor(new [] { typeof(AssetImportContext), });
            var disableValidationMethod = styleSheetImporterType.GetProperty("disableValidation");
            var importMethod = styleSheetImporterType.GetMethod("Import", new [] { typeof(StyleSheet), typeof(string), });

            CssTranspileImporter.ImporterImplConstructor = constructor;
            CssTranspileImporter.ImporterImplDisableValidationProperty = disableValidationMethod;
            CssTranspileImporter.ImporterImplImportMethod = importMethod;
        }

        public override void OnImportAsset(AssetImportContext ctx)
        {
            // トランスパイル実行
            var text = CssTranspileImporter.CssToUss(ctx.assetPath);

            var asset = ScriptableObject.CreateInstance<StyleSheet>();
            asset.hideFlags = HideFlags.NotEditable;
            // .uss のインポーターに投げ込む
            if(string.IsNullOrEmpty(text) == false)
            {
                var instance = CssTranspileImporter.ImporterImplConstructor.Invoke(new object[] { ctx, });
                CssTranspileImporter.ImporterImplDisableValidationProperty.SetValue(instance, false);
                CssTranspileImporter.ImporterImplImportMethod.Invoke(instance, new object[] { asset, text, });
            }
            ctx.AddObjectToAsset("stylesheet", asset);
            ctx.SetMainObject(asset);
        }

        private static string CssToUss(string inputAssetPath)
        {
            var editorPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var workingDirectory = Path.GetFullPath(editorPath!);
            var assetPath = Path.GetFullPath(inputAssetPath);

            // node/transpile.min.mjs を実行してcssをussに変換する
            var scriptPath = Path.Combine("node", "transpile.min.mjs");
            var processArgument = new ProcessStartInfo("node", $"{scriptPath} {assetPath}")
            {
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                ErrorDialog = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var process = new Process();
            using var cancellationTokenSource = new CancellationTokenSource();
            var builder = new System.Text.StringBuilder();

            process.EnableRaisingEvents = true;
            process.StartInfo = processArgument;
            process.OutputDataReceived += (_, ev) =>
            {
                if(ev.Data == null)
                    return;
                builder.Append(ev.Data);
                builder.Append('\n');
            };
            process.ErrorDataReceived += (_, ev) =>
            {
                if(ev.Data == null)
                    return;
                builder.Append(ev.Data);
                builder.Append('\n');
            };
            process.Exited += (_, _) =>
            {
                cancellationTokenSource.Cancel();
            };

            process.Start();
            process.BeginErrorReadLine();
            process.BeginOutputReadLine();
            cancellationTokenSource.Token.WaitHandle.WaitOne();

            // トランスパイル失敗
            if(process.ExitCode != 0)
            {
                UnityEngine.Debug.LogError($"Failed to transpile css({inputAssetPath}) to uss: {builder}");
                return string.Empty;
            }

            var text = builder.ToString();
            UnityEngine.Debug.Log($"Import css to uss: {inputAssetPath} -> {text}");

            return text;
        }
    }
}
