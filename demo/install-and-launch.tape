# Demo 1: Install and launch Salazar
# Shows: npm install → salazar → TUI launcher

Output demo/install-and-launch.gif
Output demo/install-and-launch.mp4

Set FontFamily "JetBrains Mono"
Set FontSize 16
Set Width 900
Set Height 500
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set CursorBlink false

# Install
Type "npm i -g salazar"
Sleep 500ms
Enter
Sleep 2s

# Fake install output
Type@0ms ""
Sleep 500ms

# Launch
Type "salazar"
Sleep 500ms
Enter
Sleep 3s

# The TUI launcher should render here
# Arrow down to "New Build"
Down
Sleep 500ms
Enter
Sleep 1s

# WHERE: output directory
# Default is shown, just press Enter to accept
Sleep 1s
Enter
Sleep 500ms

# WHAT: spec file path
Type "counter-spec.md"
Sleep 500ms
Enter
Sleep 1s

# Confirm screen
Sleep 2s
Enter
Sleep 2s
