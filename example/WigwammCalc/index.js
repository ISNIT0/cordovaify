var ractive = Ractive({
    el: 'body',
    template: '#home',
    data: {
        outcode: undefined,
        salary: undefined,
        areaData: {},
        formatMoney: function(value){
            return accounting.formatMoney(value, '£');
        },
        houseSize: function(areaDetail, budget) {
            var self = this;

            var keys = ["min_price_1_bedroom",
                "min_price_2_bedroom",
                "min_price_3_bedroom",
                "min_price_4_bedroom",
                "min_price_5_plus_bedroom"];

            var rooms = keys.reduce(function(acc, key, index) {
                if (Number(areaDetail[key]) <= budget)
                    return index + 1;
                return acc;
            }, 0);
            
            if(rooms == 5)
                rooms = rooms + '+';
                
            return rooms;
        }
    },
    oninit: function oninit() {
        var self = this;
        $.getJSON('./data.json').then(function(data) {
            return self.set('areaData', data);
        });
    },
    computed: {
        areaDetail: function() {
            var self = this;
            var areaData = self.get('areaData');
            var outcode = self.get('outcode');
            var areaDetail = areaData[outcode.toUpperCase()];

            if (!areaDetail || !areaDetail.HouseYield) {
                self.set('error', 'Could not find data for selected area!');
                return {};
            } else {
                self.set('error');
            }

            return areaDetail;
        },

        rentalYield: function() {
            var self = this;
            var areaDetail = self.get('areaDetail');

            return areaDetail.HouseYield;
        },
        budget: function() {
            var self = this;
            var salary = self.get('salary');
            var rentalYield = self.get('rentalYield');

            var budget = salary * 0.3 / rentalYield;

            return budget;
        },
        bankBudget: function() {
            var self = this;
            return self.get('salary') * 4;
        }
    }
});