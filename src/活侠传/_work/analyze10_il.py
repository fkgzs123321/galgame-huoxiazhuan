# -*- coding: utf-8 -*-
"""用 dncil 反汇编关键方法 IL，还原 CheckPointManager / MissionCheckData / GameTime 的真实语义。

用法：
  python analyze10_il.py <assembly> <TypeFullName> [TypeFullName ...]
"""
import io
import os
import sys

import dncil.cil.body.reader
import dnfile

sys.stdout.reconfigure(encoding="utf-8")

MANAGED = r"D:\SteamLibrary\steamapps\common\LegendOfMortal\Mortal_Data\Managed"


def mstr(h):
    try:
        return str(h)
    except Exception:
        return repr(h)


class PeReader(dncil.cil.body.reader.CilMethodBodyReaderBase):
    """从 dnfile PE 的 RVA 位置读取。"""

    def __init__(self, pe, rva):
        self.pe = pe
        self.offset = rva
        # 读取方法体头，取得代码尺寸以便一次性取出
        self.offset = rva

    def read(self, n):
        d = self.pe.get_data(self.offset, n)
        self.offset += len(d)
        return d

    def tell(self):
        return self.offset

    def seek(self, loc):
        self.offset = loc
        return self.offset


def build_maps(pe):
    md = pe.net.mdtables
    tdef = {}
    for i, row in enumerate(md.TypeDef.rows):
        tdef[i + 1] = "%s.%s" % (mstr(row.TypeNamespace), mstr(row.TypeName))
    # MethodDef -> 所属类型（通过 TypeDef.MethodList 反查）
    mdef = {}
    for row in md.TypeDef.rows:
        nm = "%s.%s" % (mstr(row.TypeNamespace), mstr(row.TypeName))
        for mi in (row.MethodList or []):
            mdef[mi.row_index + 1] = nm
    return md, tdef, mdef


def resolve(pe, md, tdef, mdef, tok):
    try:
        table = tok.table
        rid = tok.rid
    except Exception:
        return str(tok)
    try:
        if table == 6:
            row = md.MethodDef.rows[rid - 1]
            return "%s::%s" % (mdef.get(rid, "?"), mstr(row.Name))
        if table == 4:
            row = md.Field.rows[rid - 1]
            return "FIELD %s" % mstr(row.Name)
        if table == 2:
            return tdef.get(rid, "td#%d" % rid)
        if table == 1:
            row = md.TypeRef.rows[rid - 1]
            return "%s.%s" % (mstr(row.TypeNamespace), mstr(row.TypeName))
        if table == 10:
            row = md.MemberRef.rows[rid - 1]
            cls = ""
            try:
                cls = mstr(row.Class.row.TypeName)
            except Exception:
                cls = "?"
            return "%s::%s" % (cls, mstr(row.Name))
        if table == 43:
            return "METHODSPEC#%d" % rid
        if table == 112:
            try:
                return '"%s"' % pe.net.user_strings.get(rid)
            except Exception:
                return 'US#%d' % rid
    except Exception as e:
        return "<%r>" % e
    return str(tok)


def dump(pe, want_type):
    md, tdef, mdef = build_maps(pe)
    for row in md.TypeDef.rows:
        full = "%s.%s" % (mstr(row.TypeNamespace), mstr(row.TypeName))
        if full != want_type:
            continue
        for mi in (row.MethodList or []):
            m = mi.row
            rva = m.Rva
            print("=" * 76)
            print("### %s :: %s   RVA=%s" % (full, mstr(m.Name), rva))
            if not rva:
                print("   <无方法体>")
                continue
            try:
                rd = PeReader(pe, rva)
                body = dncil.cil.body.CilMethodBody(rd)
                insns = body.instructions
            except Exception as e:
                print("   <解析失败 %r>" % e)
                continue
            for ins in insns:
                op = ins.opcode.name if ins.opcode else "?"
                operand = ""
                if isinstance(ins.operand, dncil.clr.token.Token):
                    operand = resolve(pe, md, tdef, mdef, ins.operand)
                elif ins.operand is not None:
                    operand = repr(ins.operand)
                print("  IL_%04X  %-13s %s" % (ins.offset, op, operand))


if __name__ == "__main__":
    asm = sys.argv[1]
    pe = dnfile.dnPE(os.path.join(MANAGED, asm))
    for t in sys.argv[2:]:
        dump(pe, t)
    pe.close()


