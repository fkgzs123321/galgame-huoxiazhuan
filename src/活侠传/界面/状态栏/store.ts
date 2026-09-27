import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../schema';

/**
 * 前端读取 MVU 变量的唯一入口。
 *
 * message 作用域：变量绑在「界面所在楼层」，同一聊天里每层各自一份状态，
 * 回看旧楼能看到当时的数值。
 */
export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId(),
});
