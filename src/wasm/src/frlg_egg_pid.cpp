#include "frlg_egg_pid.hpp"
#include <Core/Parents/PersonalInfo.hpp>
#include <Core/Parents/PersonalLoader.hpp>
#include <Core/RNG/LCRNG.hpp>
#include <Core/Util/Utilities.hpp>
#include <algorithm>

namespace
{
bool compare_egg_states(const EggState3& left, const EggState3& right)
{
    if (left.getAdvances() < right.getAdvances()) {
        return true;
    }
    if (right.getAdvances() < left.getAdvances()) {
        return false;
    }
    return left.getPickupAdvances() < right.getPickupAdvances();
}
}

namespace ten_lines
{
void set_frlg_inheritance(
    const Daycare& daycare,
    std::array<u8, 6>& ivs,
    std::array<u8, 6>& inheritance,
    const u8* inherited_stats,
    const u8* inherited_parents)
{
    constexpr u8 stat_order[6] = { 0, 1, 2, 5, 3, 4 };
    u8 available[6] = { 0, 1, 2, 3, 4, 5 };
    // RS/FRLG removes at the selected stat value, not the sampled index; repeated inheritance is intentional.
    auto remove_available = [&available](u8 index, u8 size) {
        for (u8 i = index; i < size; i++) {
            available[i] = available[i + 1];
        }
    };

    u8 stat = available[inherited_stats[0]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[0], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[0] + 1;
    remove_available(stat, 5);

    stat = available[inherited_stats[1]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[1], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[1] + 1;
    remove_available(stat, 4);

    stat = available[inherited_stats[2]];
    ivs[stat_order[stat]] = daycare.getParentIV(inherited_parents[2], stat_order[stat]);
    inheritance[stat_order[stat]] = inherited_parents[2] + 1;
}

std::vector<EggState3> generate_frlg_pid_states(
    u32 held_seed,
    u32 pickup_seed,
    u32 held_initial_advances,
    u32 held_max_advances,
    u32 held_offset,
    u32 pickup_initial_advances,
    u32 pickup_max_advances,
    u32 pickup_offset,
    Method method,
    u8 compatibility,
    const Daycare& daycare,
    const Profile3& profile,
    const StateFilter& filter,
    u32 target_pid)
{
    const PersonalInfo* base = PersonalLoader::getPersonal(profile.getVersion(), daycare.getEggSpecie());
    const PersonalInfo* male = nullptr;
    if (daycare.getEggSpecie() == 29) {
        male = PersonalLoader::getPersonal(profile.getVersion(), 32);
    } else if (daycare.getEggSpecie() == 314) {
        male = PersonalLoader::getPersonal(profile.getVersion(), 313);
    }

    const u16 target_low = target_pid & 0xffff;
    std::vector<EggState3> held_states;
    PokeRNG held_rng(held_seed, held_initial_advances + held_offset);
    for (u32 count = 0; count <= held_max_advances; count++, held_rng.next()) {
        PokeRNG go(held_rng);
        if (((go.nextUShort() * 100) / 0xffff) >= compatibility) {
            continue;
        }

        const u16 low = go.nextUShort(0xfffe) + 1;
        if (low != target_low) {
            continue;
        }

        const PersonalInfo* info = male && (low & 0x8000) ? male : base;
        EggState3 state(
            held_initial_advances + count,
            low,
            Utilities::getGender(low, info),
            info);
        if (filter.compareAbility(state.getAbility()) && filter.compareGender(state.getGender())) {
            held_states.emplace_back(state);
        }
    }

    if (held_states.empty()) {
        return held_states;
    }

    u8 iv1_advance = 0;
    u8 iv2_advance = 0;
    u8 inheritance_advance = 1;
    switch (method) {
    case Method::RSFRLGBred:
        iv1_advance = 1;
        break;
    case Method::RSFRLGBredSplit:
        iv2_advance = 1;
        break;
    case Method::RSFRLGBredAlternate:
        iv1_advance = 1;
        inheritance_advance = 2;
        break;
    case Method::RSFRLGBredMixed:
        inheritance_advance = 2;
        break;
    default:
        return {};
    }

    const u32 target_high = target_pid & 0xffff0000;
    const u16 trainer_shiny_value = profile.getTID() ^ profile.getSID();
    std::vector<EggState3> states;
    PokeRNG pickup_rng(pickup_seed, pickup_initial_advances + pickup_offset);
    for (u32 count = 0; count <= pickup_max_advances; count++, pickup_rng.next()) {
        PokeRNG go(pickup_rng);
        const u32 high = go.nextUShort() << 16;
        if (high != target_high) {
            continue;
        }

        go.advance(iv1_advance);
        const u16 iv1 = go.nextUShort();
        go.advance(iv2_advance);
        const u16 iv2 = go.nextUShort();
        std::array<u8, 6> ivs = {
            static_cast<u8>(iv1 & 31),
            static_cast<u8>((iv1 >> 5) & 31),
            static_cast<u8>((iv1 >> 10) & 31),
            static_cast<u8>((iv2 >> 5) & 31),
            static_cast<u8>((iv2 >> 10) & 31),
            static_cast<u8>(iv2 & 31),
        };

        go.advance(inheritance_advance);
        u8 inherited_stats[3] = {
            static_cast<u8>(go.nextUShort(6)),
            static_cast<u8>(go.nextUShort(5)),
            static_cast<u8>(go.nextUShort(4)),
        };
        u8 inherited_parents[3] = {
            static_cast<u8>(go.nextUShort(2)),
            static_cast<u8>(go.nextUShort(2)),
            static_cast<u8>(go.nextUShort(2)),
        };
        std::array<u8, 6> inheritance = { 0, 0, 0, 0, 0, 0 };
        set_frlg_inheritance(daycare, ivs, inheritance, inherited_stats, inherited_parents);

        for (auto state : held_states) {
            const PersonalInfo* info = male && (target_pid & 0x8000) ? male : base;
            state.update(
                pickup_initial_advances + count,
                target_pid,
                Utilities::getShiny<true>(target_pid, trainer_shiny_value),
                ivs,
                inheritance,
                info);
            if (filter.compareHiddenPower(state.getHiddenPower())
                && filter.compareNature(state.getNature())
                && filter.compareShiny(state.getShiny())
                && filter.compareIV(state.getIVs())) {
                states.emplace_back(state);
            }
        }
    }

    std::sort(states.begin(), states.end(), compare_egg_states);
    return states;
}
}
