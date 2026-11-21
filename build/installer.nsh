CRCCheck off

!macro customInit
  # Legacy v0.1.0-v0.3.0 uninstallers cross-compiled on macOS via electron-builder's
  # UninstallerReader had a corrupted NSIS CRC32 and exited with code 2 unless passed /NCRC.
  # Before electron-builder's uninstallOldVersion runs (which retries 5 times without /NCRC
  # and then shows a misleading "LexHarness cannot be closed" dialog), close any running
  # instance and proactively run the existing old uninstaller with /NCRC so upgrades succeed
  # immediately with zero prompts.
  nsExec::Exec `"$SYSDIR\cmd.exe" /c taskkill /f /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
  Sleep 300

  ReadRegStr $R0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString
  ${if} $R0 != ""
  ${andIf} $INSTDIR != ""
  ${andIf} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
    InitPluginsDir
    CopyFiles /SILENT "$INSTDIR\${UNINSTALL_FILENAME}" "$PLUGINSDIR\legacy-uninstaller.exe"
    ${if} $installMode == "CurrentUser"
      StrCpy $R1 "/currentuser"
    ${else}
      StrCpy $R1 "/allusers"
    ${endif}
    ReadRegStr $R3 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" KeepShortcuts
    ${if} $R3 == "true"
      StrCpy $R1 "$R1 --keep-shortcuts"
    ${endif}
    ExecWait '"$PLUGINSDIR\legacy-uninstaller.exe" /NCRC /S /KEEP_APP_DATA $R1 --updated _?=$INSTDIR' $R2
  ${endif}
!macroend

!macro customUnInstallCheck
  ClearErrors
  ${if} $R0 != 0
    ${if} ${FileExists} "$PLUGINSDIR\old-uninstaller.exe"
      ExecWait '"$PLUGINSDIR\old-uninstaller.exe" /NCRC /S /KEEP_APP_DATA $0 _?=$INSTDIR' $R0
    ${endif}
    ${if} $R0 != 0
    ${andIf} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
      ExecWait '"$INSTDIR\${UNINSTALL_FILENAME}" /NCRC /S /KEEP_APP_DATA $0 _?=$INSTDIR' $R0
    ${endif}
    ${if} $R0 != 0
    ${andIf} $INSTDIR != ""
      RMDir /r "$INSTDIR"
      DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}"
      DeleteRegKey SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}"
    ${endif}
    StrCpy $R0 0
    ClearErrors
  ${endif}
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro customUnInstallCheck
!macroend
