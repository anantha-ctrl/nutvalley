<?php
/**
 * Minimal PDF writer — enough to emit a real, downloadable .pdf table report
 * without pulling in Composer/FPDF.
 *
 * Produces a PDF 1.4 file with the two standard Helvetica faces (which every
 * reader has built in, so no font embedding is needed). Text is written in
 * WinAnsi, so callers should pass plain Latin-1 content — use "Rs." rather than
 * the rupee sign, which has no WinAnsi code point.
 */
class Pdf
{
    /** Page boxes in PostScript points. */
    const A4_PORTRAIT  = [595.28, 841.89];
    const A4_LANDSCAPE = [841.89, 595.28];

    private float $w;
    private float $h;
    private float $margin = 32.0;
    private float $y;               // current cursor, measured from the page top
    private array $pages = [];      // finished content streams
    private string $buf = '';       // content stream being built
    private string $title;
    private string $subtitle = '';
    private int $pageNo = 0;

    /** Repeated at the top of every page once table() has started. */
    private array $header = [];
    private array $widths = [];

    public function __construct(string $title, string $orient = 'portrait')
    {
        [$this->w, $this->h] = $orient === 'landscape' ? self::A4_LANDSCAPE : self::A4_PORTRAIT;
        $this->title = $title;
        $this->y = $this->margin;
    }

    public function subtitle(string $s): void
    {
        $this->subtitle = $s;
    }

    // ---------------- low-level drawing ----------------

    /** Escape a string for a PDF literal and drop anything WinAnsi can't hold. */
    private static function esc(string $s): string
    {
        $s = str_replace(['₹', '—', '–', '·', '’', '“', '”'], ['Rs.', '-', '-', '|', "'", '"', '"'], $s);
        if (function_exists('iconv')) {
            $conv = @iconv('UTF-8', 'CP1252//TRANSLIT//IGNORE', $s);
            if ($conv !== false) {
                $s = $conv;
            }
        }
        $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $s);
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    }

    /** Trim a string to fit a column width at the given font size. */
    private static function fit(string $s, float $width, float $size): string
    {
        // Helvetica averages ~0.5em per glyph; 0.52 keeps a small safety margin.
        $max = (int) max(1, floor($width / ($size * 0.52)));
        return mb_strlen($s) > $max ? mb_substr($s, 0, $max - 1) . '…' : $s;
    }

    /** Draw text with its baseline at ($x, top-down $y). */
    private function text(string $s, float $x, float $y, float $size = 9, bool $bold = false, array $rgb = null): void
    {
        if ($rgb) {
            $this->buf .= sprintf("%.3f %.3f %.3f rg\n", $rgb[0], $rgb[1], $rgb[2]);
        }
        $this->buf .= sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
            $bold ? 'F2' : 'F1', $size, $x, $this->h - $y, self::esc($s));
        if ($rgb) {
            $this->buf .= "0 0 0 rg\n";
        }
    }

    private function rect(float $x, float $y, float $w, float $h, array $rgb): void
    {
        $this->buf .= sprintf("%.3f %.3f %.3f rg %.2f %.2f %.2f %.2f re f\n0 0 0 rg\n",
            $rgb[0], $rgb[1], $rgb[2], $x, $this->h - $y - $h, $w, $h);
    }

    private function line(float $x1, float $y1, float $x2, float $y2, float $gray = 0.85): void
    {
        $this->buf .= sprintf("%.3f G 0.5 w %.2f %.2f m %.2f %.2f l S 0 G\n",
            $gray, $x1, $this->h - $y1, $x2, $this->h - $y2);
    }

    // ---------------- page flow ----------------

    private function newPage(): void
    {
        if ($this->buf !== '') {
            $this->pages[] = $this->buf;
            $this->buf = '';
        }
        $this->pageNo++;
        $this->y = $this->margin;

        // Title band
        $this->text($this->title, $this->margin, $this->y + 14, 15, true);
        if ($this->subtitle !== '') {
            $this->text($this->subtitle, $this->margin, $this->y + 28, 8.5, false, [0.45, 0.45, 0.45]);
        }
        $this->text('Page ' . $this->pageNo, $this->w - $this->margin - 50, $this->y + 14, 8.5, false, [0.45, 0.45, 0.45]);
        $this->y += $this->subtitle !== '' ? 40 : 26;
        $this->line($this->margin, $this->y, $this->w - $this->margin, $this->y, 0.75);
        $this->y += 12;

        if ($this->header) {
            $this->drawHeaderRow();
        }
    }

    private function drawHeaderRow(): void
    {
        $this->rect($this->margin, $this->y - 3, $this->w - 2 * $this->margin, 16, [0.94, 0.94, 0.94]);
        $x = $this->margin + 4;
        foreach ($this->header as $i => $label) {
            $this->text(self::fit((string) $label, $this->widths[$i] - 6, 8.5), $x, $this->y + 8, 8.5, true);
            $x += $this->widths[$i];
        }
        $this->y += 17;
    }

    /** Room left before the bottom margin. */
    private function fits(float $need): bool
    {
        return ($this->y + $need) < ($this->h - $this->margin - 14);
    }

    // ---------------- public API ----------------

    /** A label/value strip, e.g. filters and totals, above the table. */
    public function summary(array $pairs): void
    {
        if (!$this->pageNo) {
            $this->newPage();
        }
        $x = $this->margin;
        $colW = ($this->w - 2 * $this->margin) / max(1, count($pairs));
        foreach ($pairs as $label => $value) {
            $this->text((string) $label, $x, $this->y + 8, 7.5, false, [0.45, 0.45, 0.45]);
            $this->text((string) $value, $x, $this->y + 21, 11, true);
            $x += $colW;
        }
        $this->y += 32;
    }

    /**
     * Render a table. $widths are relative weights, scaled to the usable width.
     * Rows paginate automatically, repeating the header on each new page.
     */
    public function table(array $header, array $widths, array $rows): void
    {
        $usable = $this->w - 2 * $this->margin;
        $sum = array_sum($widths) ?: 1;
        $this->widths = array_map(fn ($v) => $v / $sum * $usable, $widths);
        $this->header = $header;

        if (!$this->pageNo) {
            $this->newPage();
        } else {
            $this->drawHeaderRow();
        }

        foreach ($rows as $n => $row) {
            if (!$this->fits(15)) {
                $this->newPage();
            }
            if ($n % 2 === 1) {
                $this->rect($this->margin, $this->y - 3, $usable, 14, [0.975, 0.975, 0.975]);
            }
            $x = $this->margin + 4;
            foreach (array_values($row) as $i => $cell) {
                $wCol = $this->widths[$i] ?? 60;
                $this->text(self::fit((string) $cell, $wCol - 6, 8), $x, $this->y + 7.5, 8);
                $x += $wCol;
            }
            $this->y += 14;
        }

        $this->header = [];
        $this->line($this->margin, $this->y, $this->w - $this->margin, $this->y);
        $this->y += 10;
    }

    /** A short note under the table (totals, disclaimers). */
    public function note(string $s): void
    {
        if (!$this->pageNo) {
            $this->newPage();
        }
        if (!$this->fits(14)) {
            $this->newPage();
        }
        $this->text($s, $this->margin, $this->y + 8, 8, false, [0.45, 0.45, 0.45]);
        $this->y += 14;
    }

    /** Assemble the final PDF byte string. */
    public function output(): string
    {
        if ($this->pageNo === 0) {
            $this->newPage();
        }
        $this->pages[] = $this->buf;
        $this->buf = '';

        $n = count($this->pages);
        // Object ids: 1 catalog, 2 pages, 3 F1, 4 F2, then page/content pairs.
        $firstPage = 5;
        $kids = [];
        for ($i = 0; $i < $n; $i++) {
            $kids[] = ($firstPage + $i * 2) . ' 0 R';
        }

        $objs = [];
        $objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        $objs[2] = "<< /Type /Pages /Kids [" . implode(' ', $kids) . "] /Count $n >>";
        $objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
        $objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

        foreach ($this->pages as $i => $stream) {
            $pageId    = $firstPage + $i * 2;
            $contentId = $pageId + 1;
            $objs[$pageId] = sprintf(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] "
                . "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>",
                $this->w, $this->h, $contentId
            );
            $objs[$contentId] = "<< /Length " . strlen($stream) . " >>\nstream\n" . $stream . "\nendstream";
        }

        ksort($objs);
        $out = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objs as $id => $body) {
            $offsets[$id] = strlen($out);
            $out .= "$id 0 obj\n$body\nendobj\n";
        }

        $xrefPos = strlen($out);
        $max = max(array_keys($objs));
        $out .= "xref\n0 " . ($max + 1) . "\n0000000000 65535 f \n";
        for ($i = 1; $i <= $max; $i++) {
            $out .= sprintf("%010d 00000 n \n", $offsets[$i] ?? 0);
        }
        $out .= "trailer\n<< /Size " . ($max + 1) . " /Root 1 0 R >>\nstartxref\n$xrefPos\n%%EOF";
        return $out;
    }
}
