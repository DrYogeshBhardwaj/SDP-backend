const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { hashPin, comparePin } = require('../../utils/hash');
const { generateToken } = require('../../utils/jwt');
const { successResponse, errorResponse } = require('../../utils/response');
const { checkAndAwardMilestones } = require('../referral/milestone.service');


/* ---------------------------------------------------------- */
/* CHECK MOBILE */
/* ---------------------------------------------------------- */

const checkMobile = async (req, res) => {

    try {

        const { mobile } = req.body;

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return errorResponse(res, 400, "Invalid mobile number");
        }

        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        return successResponse(res, 200, "Checked", {
            exists: !!user,
            role: user ? user.role : null
        });

    } catch (error) {

        console.error(error);
        return errorResponse(res, 500, "Initial check failed");

    }

};



/* ---------------------------------------------------------- */
/* REGISTER */
/* ---------------------------------------------------------- */

const register = async (req, res) => {

    try {

        let { mobile, pin, name, amount, referral_code } = req.body;

        if (!mobile || !pin) {
            return errorResponse(res, 400, "Mobile and PIN required");
        }

        if (!/^\d{10}$/.test(mobile)) {
            return errorResponse(res, 400, "Mobile must be 10 digits");
        }

        if (!/^\d{4}$/.test(pin)) {
            return errorResponse(res, 400, "PIN must be 4 digits");
        }

        const existing = await prisma.user.findUnique({
            where: { mobile }
        });

        if (existing) {
            return successResponse(res, 200, "Account already exists");
        }

        const pin_hash = await hashPin(pin);

        const cid = `CID_${Math.random().toString(36).substring(2,8).toUpperCase()}`;

        let role = "USER_178";

        if (amount == 580) {
            role = "USER_580";
        }


        await prisma.$transaction(async (tx) => {

            const newUser = await tx.user.create({

                data: {
                    mobile,
                    name: name || null,
                    pin_hash,
                    cid,
                    role,
                    status: "ACTIVE"
                }

            });


            await tx.walletMinute.create({

                data: {
                    userId: newUser.id,
                    balance: 3650
                }

            });


            await tx.walletCash.create({

                data: {
                    userId: newUser.id,
                    balance: 0
                }

            });



            /* ---------------- REFERRAL ---------------- */

            if (referral_code) {

                const referrer = await tx.user.findFirst({

                    where: { referral_code }

                });

                if (referrer && referrer.role === "SEEDER") {

                    const L1 = 220;

                    await tx.walletCash.update({

                        where: { userId: referrer.id },

                        data: { balance: { increment: L1 } }

                    });


                    await tx.transaction.create({

                        data: {

                            userId: referrer.id,
                            type: "BONUS",
                            amount: L1,
                            description: "Level 1 Referral Bonus",
                            status: "COMPLETED"

                        }

                    });


                    await tx.bonusLedger.create({

                        data: {

                            userId: referrer.id,
                            amount: L1,
                            type: "DIRECT",
                            sourceUserId: newUser.id

                        }

                    });


                    await tx.referral.create({

                        data: {

                            referrerId: referrer.id,
                            referredUserId: newUser.id,
                            level: 1

                        }

                    });


                    await checkAndAwardMilestones(referrer.id, tx);

                }

            }

        });


        return successResponse(res, 201, "Registration successful");

    }

    catch (error) {

        console.error(error);

        return errorResponse(res, 500, "Registration failed");

    }

};



/* ---------------------------------------------------------- */
/* LOGIN */
/* ---------------------------------------------------------- */

const login = async (req, res) => {

    try {

        const { mobile, pin } = req.body;

        if (!mobile || !pin) {
            return errorResponse(res, 400, "Mobile and PIN required");
        }

        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        if (!user) {
            return errorResponse(res, 401, "Invalid credentials");
        }

        const match = await comparePin(pin, user.pin_hash);

        if (!match) {
            return errorResponse(res, 401, "Invalid credentials");
        }

        const token = generateToken({

            userId: user.id,
            role: user.role,
            cid: user.cid

        });


        res.cookie("jwt", token, {

            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000

        });


        return successResponse(res, 200, "Login success", {

            user: {

                id: user.id,
                name: user.name,
                mobile: user.mobile,
                cid: user.cid,
                role: user.role

            }

        });

    }

    catch (error) {

        console.error(error);

        return errorResponse(res, 500, "Login failed");

    }

};



/* ---------------------------------------------------------- */

const logout = async (req, res) => {

    res.clearCookie("jwt");

    return successResponse(res, 200, "Logged out");

};


/* ---------------------------------------------------------- */

module.exports = {

    checkMobile,
    register,
    login,
    logout

};
