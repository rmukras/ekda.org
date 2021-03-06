/* global ko, ekda, bootbox, utils, Ladda */

namespace("ekda.admin").QurbaniAdminModel = function () {
    var self = this;
    
    self.details = ko.observable(null);
    self.stock = ko.observable(null);
    self.results = ko.observableArray([]);
    self.includevoid = ko.observable(false);
    self.purchasedonly = ko.observable(true);
    self.qurbani = new ekda.index.QurbaniDonation(null, self.details());
    self.numbers = _.range(51);
    self.qurbaniViewModel = ko.observable(null);
    
    self.includevoid.subscribe(function () {
        self.searchQurbani();
    });
    
    self.purchasedonly.subscribe(function () {
        self.searchQurbani();
    });
    
    self.disableInstructions = ko.computed(function () {
        return !self.details() ? true : moment() >= moment(self.details().disableinstructionsdate);
    });
    
    self.qurbaniseason = ko.computed(function () {
        return !self.details() ? false : self.details().qurbaniseason;
    });
    
    self.totalsheep = ko.computed(function () {
        return !self.details() ? 0 : self.details().totalsheep;
    });
    
    self.totalcows = ko.computed(function () {
        return !self.details() ? 0 : self.details().totalcows;
    });
    
    self.totalcamels = ko.computed(function () {
        return !self.details() ? 0 : self.details().totalcamels;
    });
    
    self.purchasedSheep = ko.computed(function () {
        return !self.stock() || !self.details() ? 0 : self.details().totalsheep - self.stock().sheep;
    });
    
    self.purchasedCows = ko.computed(function () {
        return !self.stock() || !self.details() ? 0 : self.details().totalcows - self.stock().cows;
    });
    
    self.purchasedCamels = ko.computed(function () {
        return !self.stock() || !self.details() ? 0 : self.details().totalcamels - self.stock().camels;
    });
    
    self.donate = function (data, e) {
        
        var errors = [];
        
        if (self.qurbani.total() <= 0) {
            errors.push("At least one animal is required");
        }

        if (errors.length > 0) {
            toastrErrorFromList(errors, "Validation Errors");
            return;
        } else {
            
            var message = '<div class="row">  ' +
                '<div class="col-md-12"> ' +
                    '<form class="form-horizontal"> ' +
                        '<div class="form-group"> ' +
                            '<div class="col-md-12"> ' +
                                (self.disableInstructions() ? '' : '<textarea type="text" id="qurbaniName" name="name" class="form-control input-md" rows="10" placeholder="Names, one per line (Optional)"></textarea>') +
                                '<input id="qurbaniEmail" name="email" type="text" placeholder="Email to alert you after Qurbani (Optional)" class="form-control input-md top5"> ' +
                            '</div> ' +
                        '</div> ' +
                    '</form>' +
                '</div> ' +
            '</div> ';

            bootbox.dialog({
                title: (self.disableInstructions() ? "Contact Details" : "On behalf of ?"),
                message: message,
                buttons: {
                    cancel: {
                        label: "Cancel",
                        className: "btn-default btn-lg",
                        callback: function () {
                        }
                    },
                    success: {
                        label: "Continue",
                        className: "btn-primary btn-lg",
                        callback: function () {
                            var name = $('#qurbaniName').val();
                            var email = $('#qurbaniEmail').val();
                            
                            if (email && email.trim().length > 0) {
                                email = email.trim();
                                if (!utils.validEmail(email)) {
                                    toastrError("A valid email is required");
                                    return false;
                                }
                            }
                            
                            self.qurbani.instructions(name || null);
                            self.qurbani.email(email || null);
                            
                            var url = "/api/QurbaniApi/checkstockanddonate";
                            var obj = ko.toJSON(self.qurbani);

                            var lad = Ladda.create(e.currentTarget);
                            lad.start();

                            ajaxPost(url, obj, function (response) {
                                lad.stop();
                                if (!response.success) {
                                    toastrErrorFromList(response.errors, "Validation Failed");
                                } else {
                                    self.qurbani.sheep(1);
                                    self.qurbani.cows(0);
                                    self.qurbani.camels(0);
                                    self.qurbani.fullname(null);
                                    self.qurbani.email(null);
                                    self.qurbani.mobile(null);
                                    self.qurbani.instructions(null);
                                    self.searchQurbani();
                                    toastrSuccess("Donation was successfull");
                                }
                            });        
                        }
                    }
                }
            });
        }
    };

    self.toggleVoid = function(item) {
        var msg = "This will " + (item.isvoid ? "activate" : "void" ) + " the donation. Are you sure?";
        
        bootbox.confirm(msg, function(result) {
            if (result) {
                var url = "/api/QurbaniApi/togglequrbanivoid/" + item.qurbanikey;

                ajaxGet(url, function (response) {
                    if (!response.success) {
                        toastrErrorFromList(response.errors, "Toggle Void Failed");
                    } else {
                        self.searchQurbani();
                        toastrSuccess("Toggle was successful");
                    }
                });        
            }
        });
    };
    
    self.searchQurbani = function () {
        
        var po = self.purchasedonly() ? 1 : 0;
        var iv = self.includevoid() ? 1 : 0;
        var url = "/api/QurbaniApi/searchqurbani/" + po + "/" + iv;
        
        var qsr = document.querySelector("#qurbani-search");
        var lad = Ladda.create(qsr);
        lad.start();

        ajaxGet(url, function (response) {
            lad.stop();
            if (!response.success) {
                toastrErrorFromList(response.errors, "Search Failed");
            } else {
                self.results(response.item.search.items);
                self.details(response.item.details);
                self.stock(response.item.stock);
                self.qurbani.details(response.item.details);
            }
        });        
    };

    self.downloadQurbani = function () {
        var po = self.purchasedonly() ? 1 : 0;
        var iv = self.includevoid() ? 1 : 0;
        var url = "/api/QurbaniApi/downloadqurbani/" + po + "/" + iv;

        window.location.href = url;
    };
    
    self.sendQurbaniCompleteAlert = function (item) {
        if (item.iscomplete) {
            toastrWarning("An email has already been sent");
        } else {
            var msg = "This will send an email to the donor. Are you sure?";

            bootbox.confirm(msg, function(result) {
                if (result) {
                    var url = "/api/QurbaniApi/sendqurbanicompletealert/" + item.qurbanikey;

                    ajaxGet(url, function (response) {
                        if (!response.success) {
                            toastrErrorFromList(response.errors, "Alert Email Failed");
                        } else {
                            self.searchQurbani();
                            toastrSuccess("Alert was sent emails");
                        }
                    });        
                }
            });
        }
    };

    self.editDonation = function (item) {
        self.qurbaniViewModel(new ekda.admin.QurbaniViewModel(item, self.details(), function () {
            $("#qurbaniModal").modal('hide');
            self.searchQurbani();
        }));
    };

    $(function () {
        self.searchQurbani();
    });
    
};