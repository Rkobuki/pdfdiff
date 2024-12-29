# pdfdiff

Visualize and quantify differences between two PDF files.

## Usage

```
$ ./pdfdiff
Usage: A=a.pdf B=b.pdf OUTDIR=out [MASK=mask.png] [DPI=150] pdfdiff

$ A=a.pdf B=b.pdf OUTDIR=out ./pdfdiff && magick out/*.png out.pdf
```

## Requirements

- [GNU Make](https://www.gnu.org/software/make/)
- [ImageMagick](https://imagemagick.org/index.php)
- [Ghostscript](https://www.ghostscript.com/)
