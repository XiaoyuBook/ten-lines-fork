#include "util.hpp"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <string>
#include <vector>

struct StatsOcrResult {
    std::string hp;
    std::string attack;
    std::string defense;
    std::string specialAttack;
    std::string specialDefense;
    std::string speed;
    int recognizedCount;
};

namespace {
struct Rect {
    int left;
    int top;
    int right;
    int bottom;
};

struct GlyphTemplate {
    char value;
    std::array<int, 35> pixels;
};

constexpr std::array<GlyphTemplate, 11> GLYPH_TEMPLATES = { {
    { '0', { 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0 } },
    { '1', { 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0 } },
    { '2', { 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1 } },
    { '3', { 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0 } },
    { '4', { 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0 } },
    { '5', { 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0 } },
    { '6', { 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0 } },
    { '7', { 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0 } },
    { '8', { 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0 } },
    { '9', { 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0 } },
    { '/', { 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 } },
} };

int otsu_threshold(const std::vector<int>& grayscale)
{
    std::array<int, 256> histogram = {};
    for (int value : grayscale) {
        histogram[std::clamp(value, 0, 255)]++;
    }

    int total = static_cast<int>(grayscale.size());
    double sum = 0.0;
    for (int value = 0; value < 256; value++) {
        sum += value * histogram[value];
    }

    double sum_background = 0.0;
    int weight_background = 0;
    double max_variance = -1.0;
    int threshold = 128;

    for (int value = 0; value < 256; value++) {
        weight_background += histogram[value];
        if (weight_background == 0) {
            continue;
        }

        int weight_foreground = total - weight_background;
        if (weight_foreground == 0) {
            break;
        }

        sum_background += value * histogram[value];
        double mean_background = sum_background / weight_background;
        double mean_foreground = (sum - sum_background) / weight_foreground;
        double variance = static_cast<double>(weight_background) * weight_foreground * (mean_background - mean_foreground) * (mean_background - mean_foreground);
        if (variance > max_variance) {
            max_variance = variance;
            threshold = value;
        }
    }

    return std::clamp(threshold + 8, 60, 210);
}

std::vector<uint8_t> binarize(emscripten::typed_array<uint8_t> rgbaPixels, int width, int height)
{
    std::vector<int> grayscale;
    grayscale.reserve(width * height);
    for (int index = 0; index < width * height; index++) {
        int offset = index * 4;
        int red = rgbaPixels[offset];
        int green = rgbaPixels[offset + 1];
        int blue = rgbaPixels[offset + 2];
        grayscale.push_back((red * 299 + green * 587 + blue * 114) / 1000);
    }

    int threshold = otsu_threshold(grayscale);
    std::vector<uint8_t> binary(width * height, 0);
    for (int index = 0; index < width * height; index++) {
        binary[index] = grayscale[index] <= threshold ? 1 : 0;
    }
    return binary;
}

int row_sum(const std::vector<uint8_t>& binary, int width, int y, int left, int right)
{
    int total = 0;
    for (int x = left; x < right; x++) {
        total += binary[y * width + x];
    }
    return total;
}

int col_sum(const std::vector<uint8_t>& binary, int width, int top, int bottom, int x)
{
    int total = 0;
    for (int y = top; y < bottom; y++) {
        total += binary[y * width + x];
    }
    return total;
}

Rect find_content_bounds(const std::vector<uint8_t>& binary, int width, int height)
{
    Rect rect { width, height, 0, 0 };
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            if (binary[y * width + x] == 0) {
                continue;
            }
            rect.left = std::min(rect.left, x);
            rect.top = std::min(rect.top, y);
            rect.right = std::max(rect.right, x + 1);
            rect.bottom = std::max(rect.bottom, y + 1);
        }
    }

    if (rect.right <= rect.left || rect.bottom <= rect.top) {
        return { 0, 0, width, height };
    }

    int pad_x = std::max(1, width / 80);
    int pad_y = std::max(1, height / 80);
    rect.left = std::max(0, rect.left - pad_x);
    rect.top = std::max(0, rect.top - pad_y);
    rect.right = std::min(width, rect.right + pad_x);
    rect.bottom = std::min(height, rect.bottom + pad_y);
    return rect;
}

Rect tighten_band_rows(const std::vector<uint8_t>& binary, int width, int height, const Rect& band)
{
    const int min_active = std::max(1, (band.right - band.left) / 30);
    int top = band.bottom;
    int bottom = band.top;
    for (int y = band.top; y < band.bottom; y++) {
        if (row_sum(binary, width, y, band.left, band.right) >= min_active) {
            top = std::min(top, y);
            bottom = std::max(bottom, y + 1);
        }
    }

    if (bottom <= top) {
        return band;
    }

    const int pad = std::max(1, (band.bottom - band.top) / 8);
    return {
        band.left,
        std::clamp(top - pad, 0, height - 1),
        band.right,
        std::clamp(bottom + pad, top + 1, height),
    };
}

std::vector<Rect> find_fixed_row_bands(const std::vector<uint8_t>& binary, int width, int height, const Rect& bounds)
{
    std::vector<Rect> bands;
    const std::array<std::pair<double, double>, 6> ratios = {{
        { 0.00, 0.18 },
        { 0.18, 0.34 },
        { 0.34, 0.50 },
        { 0.50, 0.66 },
        { 0.66, 0.82 },
        { 0.82, 1.00 },
    }};

    const int content_height = std::max(1, bounds.bottom - bounds.top);
    for (const auto& ratio : ratios) {
        Rect band {
            bounds.left,
            bounds.top + static_cast<int>(std::floor(content_height * ratio.first)),
            bounds.right,
            bounds.top + static_cast<int>(std::ceil(content_height * ratio.second)),
        };
        band.top = std::clamp(band.top, 0, height - 1);
        band.bottom = std::clamp(band.bottom, band.top + 1, height);
        bands.push_back(tighten_band_rows(binary, width, height, band));
    }

    return bands;
}

std::vector<Rect> find_glyphs(const std::vector<uint8_t>& binary, int width, const Rect& band)
{
    std::vector<Rect> glyphs;
    int start = -1;
    int last_active = -1;

    for (int x = band.left; x < band.right; x++) {
        int sum = col_sum(binary, width, band.top, band.bottom, x);
        if (sum > 0) {
            if (start < 0) {
                start = x;
            }
            last_active = x;
            continue;
        }

        if (start >= 0 && last_active >= 0 && x - last_active > 1) {
            glyphs.push_back({ start, band.top, last_active + 1, band.bottom });
            start = -1;
            last_active = -1;
        }
    }

    if (start >= 0 && last_active >= 0) {
        glyphs.push_back({ start, band.top, last_active + 1, band.bottom });
    }

    glyphs.erase(
        std::remove_if(
            glyphs.begin(),
            glyphs.end(),
            [](const Rect& glyph) {
                return glyph.right - glyph.left <= 0 || glyph.bottom - glyph.top <= 0;
            }),
        glyphs.end());

    return glyphs;
}

std::array<int, 35> normalize_glyph(const std::vector<uint8_t>& binary, int width, const Rect& glyph)
{
    std::array<int, 35> normalized = {};
    int glyph_width = std::max(1, glyph.right - glyph.left);
    int glyph_height = std::max(1, glyph.bottom - glyph.top);

    for (int target_y = 0; target_y < 7; target_y++) {
        for (int target_x = 0; target_x < 5; target_x++) {
            int source_left = glyph.left + (target_x * glyph_width) / 5;
            int source_right = glyph.left + ((target_x + 1) * glyph_width) / 5;
            int source_top = glyph.top + (target_y * glyph_height) / 7;
            int source_bottom = glyph.top + ((target_y + 1) * glyph_height) / 7;

            if (source_right <= source_left) {
                source_right = std::min(glyph.right, source_left + 1);
            }
            if (source_bottom <= source_top) {
                source_bottom = std::min(glyph.bottom, source_top + 1);
            }

            int active = 0;
            int total = 0;
            for (int y = source_top; y < source_bottom; y++) {
                for (int x = source_left; x < source_right; x++) {
                    active += binary[y * width + x];
                    total++;
                }
            }
            normalized[target_y * 5 + target_x] = total > 0 && active * 2 >= total ? 1 : 0;
        }
    }

    return normalized;
}

char classify_glyph(const std::vector<uint8_t>& binary, int width, const Rect& glyph)
{
    const auto normalized = normalize_glyph(binary, width, glyph);
    int best_distance = 1000;
    char best = '\0';

    for (const auto& entry : GLYPH_TEMPLATES) {
        int distance = 0;
        for (int index = 0; index < 35; index++) {
            if (normalized[index] != entry.pixels[index]) {
                distance++;
            }
        }
        if (distance < best_distance) {
            best_distance = distance;
            best = entry.value;
        }
    }

    return best_distance <= 15 ? best : '\0';
}

std::string recognize_row(const std::vector<uint8_t>& binary, int width, const Rect& band)
{
    std::string token;
    for (const Rect& glyph : find_glyphs(binary, width, band)) {
        char value = classify_glyph(binary, width, glyph);
        if (value != '\0') {
            token.push_back(value);
        }
    }
    return token;
}

std::string digits_only(const std::string& value)
{
    std::string digits;
    for (char ch : value) {
        if (ch >= '0' && ch <= '9') {
            digits.push_back(ch);
        }
    }
    return digits;
}
} // namespace

StatsOcrResult recognize_stats_roi(emscripten::typed_array<uint8_t> rgbaPixels, int width, int height)
{
    StatsOcrResult result { "", "", "", "", "", "", 0 };
    if (width <= 0 || height <= 0 || rgbaPixels.size() < width * height * 4) {
        return result;
    }

    std::vector<uint8_t> binary = binarize(rgbaPixels, width, height);
    Rect bounds = find_content_bounds(binary, width, height);
    std::vector<Rect> bands = find_fixed_row_bands(binary, width, height, bounds);
    if (bands.size() < 6) {
        return result;
    }

    std::array<std::string, 6> tokens = {};
    for (size_t index = 0; index < 6 && index < bands.size(); index++) {
        tokens[index] = recognize_row(binary, width, bands[index]);
    }

    std::string hp_token = tokens[0];
    size_t slash_index = hp_token.find('/');
    if (slash_index != std::string::npos && slash_index + 1 < hp_token.size()) {
        result.hp = digits_only(hp_token.substr(slash_index + 1));
    } else {
        std::string hp_digits = digits_only(hp_token);
        if (hp_digits.size() > 3) {
            result.hp = hp_digits.substr(hp_digits.size() - 3);
        } else {
            result.hp = hp_digits;
        }
    }

    result.attack = digits_only(tokens[1]);
    result.defense = digits_only(tokens[2]);
    result.specialAttack = digits_only(tokens[3]);
    result.specialDefense = digits_only(tokens[4]);
    result.speed = digits_only(tokens[5]);

    const std::array<std::string, 6> values = {
        result.hp,
        result.attack,
        result.defense,
        result.specialAttack,
        result.specialDefense,
        result.speed,
    };
    for (const auto& value : values) {
        if (!value.empty()) {
            result.recognizedCount++;
        }
    }

    return result;
}

EMSCRIPTEN_BINDINGS(stats_ocr)
{
    emscripten::smart_function("recognize_stats_roi", &recognize_stats_roi);
    emscripten::value_object<StatsOcrResult>("StatsOcrResult")
        .field("hp", &StatsOcrResult::hp)
        .field("attack", &StatsOcrResult::attack)
        .field("defense", &StatsOcrResult::defense)
        .field("specialAttack", &StatsOcrResult::specialAttack)
        .field("specialDefense", &StatsOcrResult::specialDefense)
        .field("speed", &StatsOcrResult::speed)
        .field("recognizedCount", &StatsOcrResult::recognizedCount);
}
