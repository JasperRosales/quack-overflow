# Duck sounds

`quack.wav`, `think.wav` (the curious "quack?") and `party.wav` (triple quack + fanfare) are 16 kHz mono WAVs,
**synthesized** with the same note sequences the firmware plays (sawtooth + 2nd harmonic, downward pitch sweep).

The firmware does not need these files: it generates the sounds in code for both the buzzer and the
MAX98357A I2S option. They're here for reference, for the demo video, or if you want to swap in an SD-card/flash player.
