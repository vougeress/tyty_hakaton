import {
  FEASIBILITY_REASON_CODES,
  type FeasibilityReason,
  type FeasibilityReasonCode,
  type FeasibilityReasonSeverity,
} from "./types";

const MESSAGES: Record<FeasibilityReasonCode, string> = {
  [FEASIBILITY_REASON_CODES.INVALID_INPUT]: "Не удалось проверить даты и ограничения варианта.",
  [FEASIBILITY_REASON_CODES.ACTIVITY_OUTSIDE_WINDOW]: "Активность не помещается в выбранное окно.",
  [FEASIBILITY_REASON_CODES.OUTBOUND_ROUTE_MISSING]: "Не найден маршрут до места.",
  [FEASIBILITY_REASON_CODES.OUTBOUND_ROUTE_INVALID]: "Маршрут до места не стыкуется с активностью.",
  [FEASIBILITY_REASON_CODES.RETURN_ROUTE_MISSING]: "Не найден обратный маршрут.",
  [FEASIBILITY_REASON_CODES.RETURN_ROUTE_INVALID]: "Обратный маршрут не стыкуется с активностью.",
  [FEASIBILITY_REASON_CODES.RETURN_AFTER_DEADLINE]: "Возвращение позже следующего обязательного события.",
  [FEASIBILITY_REASON_CODES.RETURN_BUFFER_TOO_SMALL]: "После возвращения остаётся недостаточный запас времени.",
  [FEASIBILITY_REASON_CODES.BUDGET_EXCEEDED]: "Вариант превышает приватное ограничение бюджета участника.",
  [FEASIBILITY_REASON_CODES.PRICE_UNKNOWN]: "Цена на человека не подтверждена.",
  [FEASIBILITY_REASON_CODES.CAPACITY_INSUFFICIENT]: "Подтверждённых мест недостаточно для всей группы.",
  [FEASIBILITY_REASON_CODES.CAPACITY_UNKNOWN]: "Вместимость для всей группы не подтверждена.",
  [FEASIBILITY_REASON_CODES.USEFUL_TIME_TOO_SHORT]: "На месте останется слишком мало полезного времени.",
  [FEASIBILITY_REASON_CODES.TRAVEL_TIME_EXCEEDED]: "Дорога превышает ограничение одного из участников.",
  [FEASIBILITY_REASON_CODES.TRAVEL_TO_USEFUL_RATIO_HIGH]: "Дорога занимает слишком большую часть варианта.",
  [FEASIBILITY_REASON_CODES.OVERNIGHT_NOT_ALLOWED]: "Вариант включает ночной переезд, который подходит не всем.",
  [FEASIBILITY_REASON_CODES.INPUTS_CHANGED]: "Данные варианта изменились после последней проверки.",
  [FEASIBILITY_REASON_CODES.CHECK_EXPIRED]: "Результат проверки устарел и требует обновления.",
};

export function feasibilityReason(
  code: FeasibilityReasonCode,
  severity: FeasibilityReasonSeverity,
  facts?: FeasibilityReason["facts"],
): FeasibilityReason {
  return { code, message: MESSAGES[code], severity, ...(facts ? { facts } : {}) };
}
