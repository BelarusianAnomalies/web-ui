import MeteoEyeResouse from "./MeteoEyeResouse";

export default interface MeteoEyePage {
    currentPage: number;
    pageCount: number;
    pageSize: number;
    allItemsCount: number;
    items: [MeteoEyeResouse];
}
