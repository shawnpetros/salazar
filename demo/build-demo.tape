# Demo: Salazar building a counter library from a spec
# Types the real command visually, then runs the replay script behind the scenes

Output demo/build-demo.gif
Output demo/build-demo.mp4

Set FontFamily "Fira Code"
Set FontSize 15
Set Width 880
Set Height 550
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms
Set CursorBlink false
Set LetterSpacing 0
Set LineHeight 1.2
Set Shell bash

Hide
Type "cd /Users/shawnpetros/projects/salazar/demo"
Enter
Sleep 300ms
Show

Type "cat counter-spec.md"
Sleep 500ms
Enter
Sleep 2.5s

Type "clear"
Enter
Sleep 300ms

# Type the command visually but don't press Enter
Type "salazar run counter-spec.md --output-dir ./counter-lib"
Sleep 1s

# Hide, clear the line, run the replay instead
Hide
Type ""
Ctrl+U
Type "clear && bash /Users/shawnpetros/projects/salazar/demo/build-replay.sh"
Enter
Show

Sleep 25s
