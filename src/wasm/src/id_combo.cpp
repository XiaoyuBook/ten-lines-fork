#include "pokefinder_glue.hpp"
#include <Core/Gen3/Generators/IDGenerator3.hpp>
#include <Core/Parents/Filters/IDFilter.hpp>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <vector>

emscripten::typed_array<ExtendedIDState> search_frlge_id_combos(
    emscripten::val tsv_values,
    u32 advances_min,
    u32 advances_max,
    u32 max_results)
{
    emscripten::typed_array<ExtendedIDState> results;
    if (advances_max < advances_min || max_results == 0) {
        return results;
    }

    std::vector<u16> tsv_vector = emscripten::convertJSArrayToNumberVector<u16>(tsv_values);
    if (tsv_vector.empty()) {
        return results;
    }

    IDFilter filter({}, {}, tsv_vector, {});
    u32 max_advances = advances_max - advances_min;
    u32 result_count = 0;

    for (u32 tid = 0; tid <= 0xFFFF && result_count < max_results; tid++) {
        IDGenerator3 generator(advances_min, max_advances, filter);
        auto states = generator.generateFRLGE(static_cast<u16>(tid));
        for (const auto& state : states) {
            results.push_back(ExtendedIDState(state));
            result_count++;
            if (result_count >= max_results) {
                break;
            }
        }
    }

    return results;
}

EMSCRIPTEN_BINDINGS(id_combo)
{
    emscripten::smart_function("search_frlge_id_combos", &search_frlge_id_combos);
}
