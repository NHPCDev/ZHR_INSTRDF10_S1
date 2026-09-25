sap.ui.define([
    "com/nhpc/zhrinstrdf10s1/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/core/Fragment",
    "sap/ui/core/ValueState",
    "com/nhpc/zhrinstrdf10s1/utils/formatter",
    "com/nhpc/zhrinstrdf10s1/utils/messenger",
    "sap/ui/core/BusyIndicator",
    "sap/ui/export/library"
], (BaseController, Filter, FilterOperator, Spreadsheet, Fragment, ValueState, formatter, messenger, BusyIndicator,exportLibrary) => {
    "use strict";
    var EdmType = exportLibrary.EdmType;
    return BaseController.extend("com.nhpc.zhrinstrdf10s1.controller.Dashboard", {
        formatter: formatter,
        onInit() {
            this.getRouter().getRoute("RouteDashboard").attachPatternMatched(this._onRoutePatternMatched, this);
        },
        _onRoutePatternMatched: function (oEvent) {
            this.getModel().refresh();
            const oTable = this.byId("idDashboardTable");
            const oBinding = oTable.getBinding("items");
            oBinding.attachEventOnce("dataReceived", () => {
                const iCount = oBinding.getLength();
                this.getModel("viewModel").setProperty("/dashboardCount", iCount);
            });
        },

        onDashboardTableUpdateFinish: function (oEvent) {
            var oResourceBundle = this.getResourceBundle(),
                iCount = oEvent.getParameter("total");
            var sTitle = oResourceBundle.getText("dashboardTableTitle") + " (" + iCount + ")";
            this.byId("dashBoardTitle").setText(sTitle);
        },
        onCreate: function () {
            this.getRouter().navTo("RouteDetail", {
                Sno: "New",
                Pernr: "New"
            });
        },
        onListItemPress: async function (oEvent) {
            // await this.resetModel();
            var oObject = oEvent.getSource()
                .getBindingContext()
                .getObject();

            this.getRouter().navTo("RouteDetail", {
                selectedYear: oObject.Fyear,
                Pernr: oObject.Pernr
            });
        },
        onSearchBtn: function (oEvent) {
            var oTable = this.byId("idDashboardTable");
            let oFilterData = this._getTableFilters();
            oTable.getBinding("items").filter(oFilterData.aFilters);
            const oBinding = oTable.getBinding("items");
            oBinding.attachEventOnce("dataReceived", () => {
                const iCount = oBinding.getLength();
                this.getModel("viewModel").setProperty("/dashboardCount", iCount);
            });
        },

        _getTableFilters: function (oEvent) {
            var oViewModel = this.getModel("viewModel"),
                oFilterData = oViewModel.getProperty("/filterData"),
                aSearchFilter = [];
            if (oFilterData.Fyear) {
                let aFilters = [];
                aFilters.push(new Filter("Fyear", FilterOperator.EQ, oFilterData.Fyear));
                aSearchFilter.push(new Filter({
                    filters: aFilters,
                    and: false
                }));
            }
            if (oFilterData.ConfirmedOn) {
                let aFilters = [];
                aFilters.push(new Filter("ConfirmedOn", FilterOperator.EQ, oFilterData.ConfirmedOn));
                aSearchFilter.push(new Filter({
                    filters: aFilters,
                    and: false
                }));
            }
            if (oFilterData.Status) {
                let aFilters = [];
                aFilters.push(new Filter("Status", FilterOperator.EQ, oFilterData.Status));
                aSearchFilter.push(new Filter({
                    filters: aFilters,
                    and: false
                }));
            }
            return {
                aFilters: aSearchFilter.length
                    ? [new Filter({
                        filters: aSearchFilter,
                        and: true
                    })]
                    : []
            }
        },
        // onCreate: function () {
        //     var oView = this.getView();
        //     if (!this._CreateDialog) {
        //         Fragment.load({
        //             id: oView.getId(),
        //             name: "com.nhpc.zhrinstrdf10s1.fragment.Create",
        //             controller: this
        //         }).then(function (oDialog) {
        //             this._CreateDialog = oDialog;
        //             oView.addDependent(oDialog);
        //             const oTable = this.byId("idDashboardTable");
        //             const oBinding = oTable.getBinding("items");
        //             const aContexts = oBinding.getContexts();
        //             const aCreatedYears = aContexts.map(oContext =>
        //                 oContext.getProperty("Fyear")
        //             );
        //             const aFilters = aCreatedYears.map(
        //                 sYear => new Filter("Year", FilterOperator.NE, sYear)
        //             );
        //             const oComboBox = this.byId("idFyear");
        //             oComboBox.getBinding("items").filter(aFilters);
        //             oDialog.open();
        //         }.bind(this));
        //     } else {
        //         this._CreateDialog.open();
        //     }
        // },
        onCreate:async function () {
            var oView = this.getView();
            let oModel = this.getModel();
            let oResourceBundle = this.getResourceBundle();
            let bDraftValid = await this.checkValidation();
            if (!bDraftValid) {
                messenger.error(
                    oResourceBundle.getText("draftError")
                );
                return;
            }
            let bForm8Filled = await this.checkForm8Fill();
            if (!bForm8Filled) {
                messenger.error(
                    oResourceBundle.getText("form8FillError")
                );
                return;
            }
            const fnFilterFinancialYears = function () {
                const oTable = this.byId("idDashboardTable");
                const oBinding = oTable.getBinding("items");
                const aContexts = oBinding.getContexts();
                const aCreatedYears = [
                    ...new Set(
                        aContexts
                            .map(oContext => oContext.getProperty("Fyear"))
                            .filter(Boolean)
                    )
                ];
                const aFilters = aCreatedYears.map(
                    sYear => new Filter(
                        "Year",
                        FilterOperator.NE,
                        sYear
                    )
                );
                const oComboBox = this.byId("idFyear");
                const oComboBinding = oComboBox.getBinding("items");
                if (oComboBinding) {
                    oComboBinding.filter(aFilters);
                }
            }.bind(this);
            if (!this._CreateDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.nhpc.zhrinstrdf10s1.fragment.Create",
                    controller: this
                }).then(function (oDialog) {
                    this._CreateDialog = oDialog;
                    oView.addDependent(oDialog);
                    fnFilterFinancialYears();
                    oDialog.open();
                }.bind(this));
            } else {
                fnFilterFinancialYears();
                this._CreateDialog.open();
            }
        },
        checkValidation: async function () {
            let oModel = this.getModel();
            let aFilters = [
                new Filter(
                    "ApproverFlag",
                    FilterOperator.EQ,
                    "R"
                ),
                new Filter(
                    "FormNo",
                    FilterOperator.EQ,
                    "FORM10"
                ),
                new Filter(
                    "Status",
                    FilterOperator.EQ,
                    "Draft"
                )
            ];
            return new Promise((resolve) => {
                oModel.read("/Form9headSet", {
                    filters: aFilters,
                    success: function (oData) {
                        resolve(oData.results.length === 0);
                    },
                    error: function (oError) {
                        resolve(false);
                    }
                });
            });
        },
        checkForm8Fill: function () {
            let oModel = this.getModel();
            let aFilters = [
                new Filter(
                    "ApprovalFlag",
                    FilterOperator.EQ,
                    "R"
                )
            ];
            return new Promise((resolve) => {
                oModel.read("/CheckAuthSet", {
                    filters: aFilters,
                    success: function (oResponse) {
                        if (
                            oResponse.results &&
                            oResponse.results.length > 0
                        ) {
                            let sForm8Fill =
                                oResponse.results[0].Form8Fill;
                            resolve(sForm8Fill !== "No");
                        } else {
                            resolve(false);
                        }
                    },
                    error: function () {
                        resolve(false);
                    }
                });
            });
        },
        onCloseDialog: function () {
            this._CreateDialog.close();
        },
        onYearSelect: function (oEvent) {
            let oViewModel = this.getModel("viewModel");
            let oResourceBundle = this.getResourceBundle();
            let sSelectedYear = oViewModel.getProperty("/selectedFinancialYear");
            if (!sSelectedYear) {
                oViewModel.setProperty("/valueState/selectedYear", "Error");
                oViewModel.setProperty("/valueStateText/selectedYear", oResourceBundle.getText("selectedYearErrorMsg"));
                messenger.error(oResourceBundle.getText("selectedYearErrorMsg"));
                return;
            }
            const aYears = sSelectedYear.split("-").map(s => s.trim());
            const iStartYear = Number(aYears[0]);
            const iEndYear = Number(aYears[1]);
            const oFinancialYearStart = new Date(
                iStartYear,
                3,  // April
                1
            );
            const oFinancialYearEnd = new Date(
                iEndYear,
                2,  // March
                31
            );
            oFinancialYearStart.setHours(0, 0, 0, 0);
            oFinancialYearEnd.setHours(23, 59, 59, 999);
            oViewModel.setProperty(
                "/financialYearStart",
                oFinancialYearStart
            );
            oViewModel.setProperty(
                "/financialYearEnd",
                oFinancialYearEnd
            );
            oViewModel.setProperty("/valueState/selectedYear", "None");
            oViewModel.setProperty("/valueStateText/selectedYear", "");
            oViewModel.setProperty("/selectedFinancialYear","");
            this.getRouter().navTo("RouteDetail", {
                selectedYear: sSelectedYear,
                Pernr: "New",
            });
        },
        onDownload: function () {
            var oTable = this.byId("idDashboardTable");
            var oBinding = oTable.getBinding("items");
            var aCols = this.createColumnConfig();
            var oSettings = {
                workbook: {
                    columns: aCols
                },
                dataSource: oBinding,
                fileType: "xlsx",
                fileName: this.getResourceBundle().getText("title")
            };
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build()
                .finally(function () {
                    oSheet.destroy();
                });
        },
        createColumnConfig: function () {
            var aCols = [];
            aCols.push({
                label: this.getResourceBundle().getText("fYear"),
                property: "Fyear"
            });
            aCols.push({
                label: this.getResourceBundle().getText("employeeID"),
                property: "Pernr"
            });
            aCols.push({
                label: this.getResourceBundle().getText("employeeNameLabel"),
                property: "EmployeeName"
            });
            aCols.push({
                label: this.getResourceBundle().getText("createdOn"),
                property: "CreatedOn",
                type: EdmType.Date,
                inputFormat: "yyyymmdd",
                format: "dd.mm.yyyy"
            });
            aCols.push({
                label: this.getResourceBundle().getText("confirmedOn"),
                property: "ConfirmedOn",
                type: EdmType.Date,
                inputFormat: "yyyymmdd",
                format: "dd.mm.yyyy"
            });
            aCols.push({
                label: this.getResourceBundle().getText("delayed"),
                property: "Delayed"
            });
            aCols.push({
                label: this.getResourceBundle().getText("status"),
                property: "Status"
            });
            return aCols;
        },
        onValueHelpRequest: async function (oEvent) {
            this._oInput = oEvent.getSource();
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.nhpc.zhrinstrdf10s1.fragment.EmployeeValueHelp",
                    controller: this
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            this._oValueHelpDialog.open();
        },
        onValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "Empid",
                FilterOperator.Contains,
                sValue
            );
            var oFilter2 = new Filter(
                "FullName",
                FilterOperator.Contains,
                sValue
            );
            var oCombinedFilter = new Filter({
                filters: [oFilter, oFilter2],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oCombinedFilter]);
        },
        onValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                this._oInput.setValue(oSelectedItem.getTitle());
                this.getModel("viewModel").setProperty("/filterData/Pernr", oSelectedItem.getTitle());
            }
        }
    });
});