Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = folder
If Not fso.FileExists(folder & "\dist\index.html") Then
  sh.Run "cmd /c npm run build", 1, True
End If
sh.Run "node server.mjs", 0, False
WScript.Sleep 1200
sh.Run "http://localhost:8787"
