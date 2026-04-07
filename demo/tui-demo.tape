# Demo: Salazar TUI — install → launcher → new build flow
# Everything runs through a wrapper script so no setup commands leak

Output demo/tui-demo.gif
Output demo/tui-demo.mp4

Set FontFamily "Fira Code"
Set FontSize 15
Set Width 880
Set Height 500
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set CursorBlink false
Set LetterSpacing 0
Set LineHeight 1.2
Set Shell bash

# Run the wrapper script — it shows fake install then launches real salazar
Hide
Type "bash /Users/shawnpetros/projects/salazar/demo/run-tui-demo.sh"
Enter
Show

# Wait for fake install output + launcher to render
Sleep 6s

# Launcher: "New Build" should be selected
Enter
Sleep 3s

# Step 1/3 — Output directory (empty default since defaultDir is "")
Type "~/projects/counter-lib"
Sleep 1s
Enter
Sleep 2s

# Step 2/3 — Spec file path
Type "/tmp/counter-spec.md"
Sleep 1s
Enter
Sleep 3s

# Step 3/3 — Confirm screen
Sleep 4s
