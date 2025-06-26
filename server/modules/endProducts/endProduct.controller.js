const { isEmpty, find, isUndefined } = require('lodash');
const PubSub = require('pubsub-js');

const helperService = require('../../helpers/APIResponse');
const config = require('../../config/config');
const Model = require('../endProducts/endProduct.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getDateMonthYearTime } = require('../../config/dateutil');


const listAll = async (req, res, next) => {
    try {
        const result = await Model.listAll();
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach((ele) => {

                if (!ele.linked_IndustryAndSubIndustry[0]._id) {
                    ele.linked_IndustryAndSubIndustry = [];
                }
                if (!ele.linked_ProcessAndSubProcess[0]._id) {
                    ele.linked_ProcessAndSubProcess = [];
                }
                if (!ele.linked_CategoryAndSubCategory[0]._id) {
                    ele.linked_CategoryAndSubCategory = [];
                }
                if (!ele.linked_RecommendationChart[0]._id) {
                    ele.linked_RecommendationChart = [];
                }

                ele.testimonials = ele.testimonials[0];
                ele.linked_KonspecCode = ele.linked_KonspecCode[0];
                ele.linked_Customer = ele.linked_Customer[0];
                ele.linked_Video = ele.linked_Video[0];

                if (ele.image && ele.image[0].length > 0) {
                    ele.image[0].forEach((elem) => {
                        elem.imageURL = config.imageURL + elem._id;
                    });
                } else {
                    let data = {
                        _id: '',
                        imageURL: config.placeholder_image
                    };
                    ele.image[0] = [data];
                }
                ele.image = ele.image[0];

                if (ele.linked_RecommendationChart && ele.linked_RecommendationChart.length > 0) {
                    ele.linked_RecommendationChart.forEach(element => {
                        if (element.file && element.file.length > 0) {
                            element.file.forEach(elem => {
                                elem.fileURL = config.imageURL + elem._id;
                            });
                        }
                    });

                }

                ele.created_at = getDateMonthYearTime(ele.created_at)
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const Details = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Model.details(id)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {

            if (!result.linked_IndustryAndSubIndustry[0]._id) {
                result.linked_IndustryAndSubIndustry = [];
            }
            if (!result.linked_ProcessAndSubProcess[0]._id) {
                result.linked_ProcessAndSubProcess = [];
            }
            if (!result.linked_CategoryAndSubCategory[0]._id) {
                result.linked_CategoryAndSubCategory = [];
            }
            if (!result.linked_RecommendationChart[0]._id) {
                result.linked_RecommendationChart = [];
            }

            result.testimonials = result.testimonials[0];
            result.linked_KonspecCode = result.linked_KonspecCode[0];
            result.linked_Customer = result.linked_Customer[0];
            result.linked_Video = result.linked_Video[0];

            if (result.image && result.image[0].length > 0) {
                result.image[0].forEach((ele) => {
                    ele.imageURL = config.imageURL + ele._id;
                });
            } else {
                let data = {
                    _id: '',
                    imageURL: config.placeholder_image
                };
                result.image[0] = [data];
            }
            result.image = result.image[0];

            if (result.linked_RecommendationChart && result.linked_RecommendationChart.length > 0) {
                result.linked_RecommendationChart.forEach(element => {
                    if (element.file && element.file.length > 0) {
                        element.file.forEach(ele => {
                            ele.fileURL = config.imageURL + ele._id;
                        });
                    }
                });

            }

            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};


const create = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.create(req.body, loggedUser);
        res.json({ message: 'successfully created!', status: 200, data: result });
    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.update(req.params.id, req.body, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'update successful', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

const Details_linkedIndustryAndSubIndustry = async (req, res, next) => {
    const id = req.params.id;
    const industryId = req.body.industryId;
    await Model.details(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                console.log('result: ', result.linked_IndustryAndSubIndustry);

                if (!result.linked_IndustryAndSubIndustry[0]._id) {
                    result.linked_IndustryAndSubIndustry = [];
                }
                if (!result.linked_ProcessAndSubProcess[0]._id) {
                    result.linked_ProcessAndSubProcess = [];
                }
                if (!result.linked_CategoryAndSubCategory[0]._id) {
                    result.linked_CategoryAndSubCategory = [];
                }

                result.testimonials = result.testimonials[0];
                result.linked_RecommendationChart = result.linked_RecommendationChart[0];
                result.linked_KonspecCode = result.linked_KonspecCode[0];
                result.linked_Customer = result.linked_Customer[0];
                if (result.image && result.image[0].length > 0) {
                    result.image[0].forEach((ele) => {
                        ele.imageURL = config.imageURL + ele._id;
                    });
                }
                result.image = result.image[0];

                let linkedIndustryAndSubIndustry = {};
                if (result.linked_IndustryAndSubIndustry) {
                    linkedIndustryAndSubIndustry = find(result.linked_IndustryAndSubIndustry, (filter) => {
                        return JSON.stringify(filter._id) == JSON.stringify(industryId);
                    });
                }

                res.json(linkedIndustryAndSubIndustry, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Details_linkedProcessAndSubProcess = async (req, res, next) => {
    const id = req.params.id;
    const processId = req.body.processId;
    await Model.details(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {

                if (!result.linked_IndustryAndSubIndustry[0]._id) {
                    result.linked_IndustryAndSubIndustry = [];
                }
                if (!result.linked_ProcessAndSubProcess[0]._id) {
                    result.linked_ProcessAndSubProcess = [];
                }
                if (!result.linked_CategoryAndSubCategory[0]._id) {
                    result.linked_CategoryAndSubCategory = [];
                }

                result.testimonials = result.testimonials[0];
                result.linked_RecommendationChart = result.linked_RecommendationChart[0];
                result.linked_KonspecCode = result.linked_KonspecCode[0];
                result.linked_Customer = result.linked_Customer[0];
                if (result.image && result.image[0].length > 0) {
                    result.image[0].forEach((ele) => {
                        ele.imageURL = config.imageURL + ele._id;
                    });
                }
                result.image = result.image[0];

                let linkedProcessAndSubProcess = {};
                if (result.linked_IndustryAndSubIndustry) {
                    linkedProcessAndSubProcess = find(result.linked_ProcessAndSubProcess, (filter) => {
                        return JSON.stringify(filter._id) == JSON.stringify(processId);
                    });
                }

                res.json(linkedProcessAndSubProcess, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Details_linkedCategoryAndSubCategory = async (req, res, next) => {
    const id = req.params.id;
    const categoryId = req.body.categoryId;
    await Model.details(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {

                if (!result.linked_IndustryAndSubIndustry[0]._id) {
                    result.linked_IndustryAndSubIndustry = [];
                }
                if (!result.linked_ProcessAndSubProcess[0]._id) {
                    result.linked_ProcessAndSubProcess = [];
                }
                if (!result.linked_CategoryAndSubCategory[0]._id) {
                    result.linked_CategoryAndSubCategory = [];
                }

                result.testimonials = result.testimonials[0];
                result.linked_RecommendationChart = result.linked_RecommendationChart[0];
                result.linked_KonspecCode = result.linked_KonspecCode[0];
                result.linked_Customer = result.linked_Customer[0];
                if (result.image && result.image[0].length > 0) {
                    result.image[0].forEach((ele) => {
                        ele.imageURL = config.imageURL + ele._id;
                    });
                }
                result.image = result.image[0];

                let linkedCategoryAndSubCategory = {};
                if (result.linked_IndustryAndSubIndustry) {
                    linkedCategoryAndSubCategory = find(result.linked_CategoryAndSubCategory, (filter) => {
                        return JSON.stringify(filter._id) == JSON.stringify(categoryId);
                    });
                }

                res.json(linkedCategoryAndSubCategory, 200, next);
            }
        })
        .catch((e) => next(e));
};

const linkIndustryAndSubIndustry = async (req, res, next) => {
    try {
        const id = req.params.id;
        const LoggedUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.linkIndustryAndSubIndustry(id, req.body, LoggedUserInfo);
        if (result) {
            helperService.sendLinkingSuccessfulResponse(res);
        } else {
            helperService.formatFailureMessage(res, result);
        }
    } catch (error) {
        next(error);
    }
};

const linkProcessAndSubProcess = async (req, res, next) => {
    try {
        const id = req.params.id;
        const LoggedUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.linkProcessAndSubProcess(id, req.body, LoggedUserInfo);
        if (result) {
            helperService.sendLinkingSuccessfulResponse(res);
        } else {
            helperService.formatFailureMessage(res, result);
        }
    } catch (error) {
        next(error);
    }
};

const linkCategoryAndSubCategory = async (req, res, next) => {
    try {
        const id = req.params.id;
        const LoggedUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.linkCategoryAndSubCategory(id, req.body, LoggedUserInfo);
        if (result) {
            helperService.sendLinkingSuccessfulResponse(res);
        } else {
            helperService.formatFailureMessage(res, result);
        }
    } catch (error) {
        next(error);
    }
};

const linkRecommendationChart = async (req, res, next) => {
    try {
        const id = req.params.id;
        const LoggedUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.linkRecommendationChart(id, req.body, LoggedUserInfo);
        if (result) {
            helperService.sendLinkingSuccessfulResponse(res);
        } else {
            helperService.formatFailureMessage(res, result);
        }
    } catch (error) {
        next(error);
    }
};

const linkKonspecCode = async (req, res, next) => {
    const id = req.params.id;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.linkKonspecCode(id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const linkVideo = async (req, res, next) => {
    const id = req.params.id;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.linkVideo(id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const linkCustomer = async (req, res, next) => {
    const id = req.params.id;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.linkCustomer(id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkIndustryAndSubIndustry = async (req, res, next) => {
    const id = req.params.id;
    const industryId = req.body.industryId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkIndustryAndSubIndustry(id, industryId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkProcessAndSubProcess = async (req, res, next) => {
    const id = req.params.id;
    const processId = req.body.processId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkProcessAndSubProcess(id, processId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkCategoryAndSubCategory = async (req, res, next) => {
    const id = req.params.id;
    const categoryId = req.body.categoryId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkCategoryAndSubCategory(id, categoryId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkRecommendationChart = async (req, res, next) => {
    const id = req.params.id;
    const RecommendationChartId = req.body.RecommendationChartId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkRecommendationChart(id, RecommendationChartId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkKonspecCode = async (req, res, next) => {
    const id = req.params.id;
    const konspecCodeId = req.body.konspecCodeId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkKonspecCode(id, konspecCodeId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkVideo = async (req, res, next) => {
    const id = req.params.id;
    const videoId = req.body.videoId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkVideo(id, videoId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const unLinkCustomer = async (req, res, next) => {
    const id = req.params.id;
    const customerId = req.body.customerId;
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.unLinkCustomer(id, customerId, getCurrentUserInfo);
        })
        .then((result) => {
            if (result) {
                helperService.sendUnLinkingSuccessfulResponse(res);
            } else {
                helperService.formatFailureMessage(res, result);
            }
        })
        .catch((e) => next(e));
};

const addTestimonials = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.addTestimonials(req.params.id, req.body, loggedUser);
        res.json({ message: 'successfully created!', status: 200, data: result });
    } catch (error) {
        next(error);
    }
};

const viewTestimonials = async (req, res, next) => {
    try {
        let endProdId = req.params.endProductId;
        let testmonialId = req.params.testmonialId;
        const loggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.viewTestimonials(endProdId, testmonialId, loggedUser);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const updateTestimonials = async (req, res, next) => {
    try {
        let endProdId = req.params.endProductId;
        let testmonialId = req.params.testmonialId;
        const loggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.updateTestimonials(endProdId, testmonialId, req.body, loggedUser);
        res.json({ message: 'successfully updated!', status: 200 });
    } catch (error) {
        next(error);
    }
};

const deleteTestimonials = async (req, res, next) => {
    try {
        let endProdId = req.params.endProductId;
        let testmonialId = req.params.testmonialId;
        const loggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.deleteTestimonials(endProdId, testmonialId, loggedUser);
        res.json({ message: 'successfully deleted!', status: 200 });
    } catch (error) {
        next(error);
    }
};


const Delete = async (req, res, next) => {
    try {
        let id = req.params.id;
        const LoggedUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.delete(id, LoggedUserInfo);
        if (result == 0) {
            res.status(409).json({ message: 'delete failed', status: 409 });
        } else {
            const deleteDupData = {
                delete: true,
                _id: id
            };
            PubSub.publishSync('DBDelete', { change: 'endProduct', data: deleteDupData });
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listAll,
    Details,
    create,
    update,
    Delete,
    linkIndustryAndSubIndustry,
    linkProcessAndSubProcess,
    linkCategoryAndSubCategory,
    linkRecommendationChart,
    linkKonspecCode,
    linkVideo,
    linkCustomer,
    unLinkIndustryAndSubIndustry,
    unLinkProcessAndSubProcess,
    unLinkCategoryAndSubCategory,
    unLinkRecommendationChart,
    unLinkKonspecCode,
    unLinkVideo,
    unLinkCustomer,
    addTestimonials,
    viewTestimonials,
    updateTestimonials,
    deleteTestimonials,
    Details_linkedIndustryAndSubIndustry,
    Details_linkedProcessAndSubProcess,
    Details_linkedCategoryAndSubCategory,
};