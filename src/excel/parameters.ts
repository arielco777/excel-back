import type { GroupData, RowData, RowType } from "../types/ExcelType";
import type { MenuItemProp } from "../types/ParametersType";

function isGroupData(data: RowData | GroupData): data is GroupData {
    return (
        Array.isArray(data) &&
        data.length > 0 &&
        Array.isArray(data[0]) &&
        Array.isArray((data[0] as RowType)[0])
    );
}

function isRowData(data: RowData | GroupData): data is RowData {
    return (
        Array.isArray(data) &&
        data.length > 0 &&
        Array.isArray(data[0]) &&
        typeof (data[0] as RowType)[0] !== "object"
    );
}

function makeRowMessage(
    parameter: MenuItemProp,
    value: number | string = ""
): RowType {
    if (value == "") {
        return [
            `${parameter.param}: ${parameter.column} ${parameter.equalizer} ${parameter.equalTo}`,
            ``,
        ];
    } else {
        return [
            `${parameter.param}: ${parameter.column} ${parameter.equalizer} ${parameter.equalTo}`,
            `${value}`,
        ];
    }
}

function evaluationString(parameter: MenuItemProp): string {
    return `(y)=>y${parameter.equalizer}${
        typeof parameter.equalTo == "string"
            ? JSON.stringify(parameter.equalTo)
            : parameter.equalTo
    }`;
}

function evalParams(
    rowData: RowData | GroupData,
    headers: RowType,
    parameter: MenuItemProp[]
): RowData | GroupData {
    let data = rowData;
    parameter.forEach((param, paramCounter) => {
        switch (param.param) {
            case "SHOW_IF":
                data = showIfs(
                    data,
                    param,
                    headers,
                    parameter.length,
                    paramCounter
                );
                break;
            case "COUNT_IF":
                data = countIf(data, param, headers);
                break;
            case "ADD_IF":
                data = addIf(data, param, headers);
                break;
        }
    });
    return data;
}

const showIfs = (
    rowData: RowData | GroupData,
    parameter: MenuItemProp,
    headers: RowType,
    parameterLength: number,
    parametersCount: number
) => {
    const headerIndex = headers.indexOf(parameter.column);
    if (headerIndex < 0) return rowData;

    const evaluation = eval(evaluationString(parameter));

    const comparisonFunction = new Function(
        "y",
        `return y ${parameter.equalizer} ${parameter.equalTo}`
    );

    if (isRowData(rowData)) {
        rowData.splice(0, 1);
        rowData = rowData.filter((row) => evaluation(row[headerIndex]));
        rowData.unshift(headers);
        rowData.push(makeRowMessage(parameter));
    } else if (isGroupData(rowData)) {
        rowData = rowData.map((group) => {
            const parameters = [];
            for (
                let i = group.length - 1;
                i >= group.length - parametersCount;
                i--
            ) {
                parameters.push(group[i]);
            }
            group = group.filter((row, idx) => evaluation(row[headerIndex]));
            if (parametersCount > 0) group.unshift(headers);
            parameters.forEach((p) => group.push(p));
            group.push(makeRowMessage(parameter));
            return group;
        });
        rowData = rowData.filter((group) => group.length > parametersCount + 2);
    }
    return rowData;
};

const countIf = (
    rowData: GroupData | RowData,
    parameter: MenuItemProp,
    headers: RowType
) => {
    const headerIndex = headers.indexOf(parameter.column);
    if (headerIndex < 0) return rowData;

    const evaluation = eval(evaluationString(parameter));

    if (isGroupData(rowData)) {
        rowData.forEach((group) => {
            let count = 0;
            group.forEach((d) => {
                if (evaluation(d[headerIndex])) count++;
            });
            const countIfRow: RowType = makeRowMessage(parameter, count);
            group.push(countIfRow);
        });
    } else if (isRowData(rowData)) {
        let count = 0;
        rowData.forEach((data) => {
            if (evaluation(data[headerIndex])) count++;
        });
        const countIfRow: RowType = makeRowMessage(parameter, count);
        rowData.push(countIfRow);
    }
    return rowData;
};

const addIf = (
    rowData: GroupData | RowData,
    parameter: MenuItemProp,
    headers: RowType
) => {
    const headerIndex = headers.indexOf(parameter.column);
    if (headerIndex < 0) return rowData;
    const evaluation = eval(evaluationString(parameter));
    if (isRowData(rowData)) {
        let result = 0;
        rowData.forEach((row) => {
            if (evaluation) {
                result += row[headerIndex] as number;
            }
        });
        rowData.push(makeRowMessage(parameter, result));
    } else if (isGroupData(rowData)) {
        rowData.forEach((group) => {
            let result = 0;
            group.forEach((row) => {
                if (evaluation) {
                    result += row[headerIndex] as number;
                }
            });
            group.push(makeRowMessage(parameter, result));
        });
    }
    return rowData;
};

export default evalParams;
