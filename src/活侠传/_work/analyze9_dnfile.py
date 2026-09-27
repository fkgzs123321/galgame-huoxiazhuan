# -*- coding: utf-8 -*-
"""解析 Mortal.*.dll 的类型成员 + IL 反汇编，还原 checkpoint 系统真实实现。"""
import os
import sys

import dnfile

sys.stdout.reconfigure(encoding="utf-8")

MANAGED = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\Managed"


def mstr(h):
    try:
        return str(h)
    except Exception:
        return repr(h)


def load(dll):
    pe = dnfile.dnPE(os.path.join(MANAGED, dll))
    md = pe.net.mdtables
    types = {}
    for row in md.TypeDef:
        ns = mstr(row.TypeNamespace or "")
        nm = mstr(row.TypeName or "")
        full = (ns + "." + nm) if ns else nm
        methods = []
        for mi in (row.MethodList or []):
            try:
                methods.append(mi.row)
            except Exception:
                pass
        fields = []
        for fi in (row.FieldList or []):
            try:
                fields.append(fi.row)
            except Exception:
                pass
        types[full] = {"row": row, "methods": methods, "fields": fields}
    return pe, types


def dump_members(pe, types, names):
    for full in names:
        t = types.get(full)
        if not t:
            print("  (缺失 %s)" % full)
            continue
        print("-" * 72)
        print(full)
        for f in t["fields"]:
            print("    FIELD  %-32s %s" % (mstr(f.Name), mstr(f.Signature)))
        for m in t["methods"]:
            try:
                pl = m.Signature.ParamList
                ps = ", ".join(mstr(x[0]) for x in pl) if pl else ""
            except Exception as e:
                ps = "<%s>" % e
            print("    METHOD %-32s (%s)  RVA=%s" % (mstr(m.Name), ps, getattr(m, "Rva", "?")))


pe, types = load("Mortal.Story.dll")
print("=" * 78)
print("### Mortal.Story.dll")
dump_members(pe, types, ["Mortal.Story.CheckPointManager",
                         "Mortal.Story.ConditionResultConfig",
                         "Mortal.Story.SwitchResultConfig",
                         "Mortal.Story.DiceResultConfig",
                         "Mortal.Story.PositionResultConfig",
                         "Mortal.Story.IScriptCheckPoint"])

pe2, types2 = load("Mortal.Core.dll")
print()
print("=" * 78)
print("### Mortal.Core.dll")
dump_members(pe2, types2, ["Mortal.Core.ConditionResultData",
                           "Mortal.Core.ConditionResultItem",
                           "Mortal.Core.MissionManagerData",
                           "Mortal.Core.MissionData",
                           "Mortal.Core.MissionCheckData",
                           "Mortal.Core.SubMissionsData",
                           "Mortal.Core.GameTimeData",
                           "Mortal.Core.GameTimeDataCollection",
                           "Mortal.Core.EventFlagSave",
                           "Mortal.Core.PlayerEventFlagStat",
                           "Mortal.Core.PlayerMissionStat",
                           "Mortal.Core.MissionSave",
                           "Mortal.Core.GameTime",
                           "Mortal.Core.PositionEvent",
                           "Mortal.Core.PositionEventRate"])

