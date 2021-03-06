import Vue from "vue";
import VeeValidate from "vee-validate";

export const emailValidator = {
    getMessage() {
        return "Use your e-mail, not NetID (e.g. C.S.Hub@student.tudelft.nl)";
    },
    validate(value: string) {
        const regex = new RegExp("^[a-zA-Z.]*$");
        return regex.test(value) && value.includes(".") && value[value.length - 1] !== ".";
    }
};

Vue.use(VeeValidate, { inject: false, delay: 1 });

